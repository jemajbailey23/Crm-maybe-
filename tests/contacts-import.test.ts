import { describe, it, expect, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// importContactsCsv calls revalidatePath, which throws outside a real
// Next.js request/render context ("static generation store missing").
// Server actions invoked directly in tests need this no-op'd, same as
// server-only is stubbed via tests/stubs — see vitest.config.ts.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { importContactsCsv } = await import("@/app/(app)/contacts/import/actions");

// Bugfix regression: importContactsCsv used to create a new Contact for
// every row unconditionally — re-uploading the same file (or two rows in
// one file describing the same person) duplicated every contact. These
// tests exercise the real server action end-to-end (real DB, real CSV
// parsing) rather than a lower-level unit, since the bug was specifically
// about the action's row-by-row create logic.
const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const email = `dedup-${RUN_ID}@example.com`;
const businessName = `Dedup Biz ${RUN_ID}`;

function csvFile(content: string) {
  return new File([content], "leads.csv", { type: "text/csv" });
}

function formDataFor(content: string) {
  const fd = new FormData();
  fd.set("file", csvFile(content));
  return fd;
}

afterAll(async () => {
  await prisma.contact.deleteMany({
    where: { OR: [{ email }, { businessName }, { AND: [{ firstName: "Dedup" }, { lastName: `Person${RUN_ID}` }] }] },
  });
});

describe("importContactsCsv — duplicate prevention", () => {
  it("re-importing the same file with an email column does not duplicate the contact", async () => {
    const csv = `firstName,lastName,email\nJane,Doe,${email}\n`;

    const first = await importContactsCsv({}, formDataFor(csv));
    expect(first.result?.imported).toBe(1);
    expect(first.result?.skipped).toHaveLength(0);

    const second = await importContactsCsv({}, formDataFor(csv));
    expect(second.result?.imported).toBe(0);
    expect(second.result?.skipped).toHaveLength(1);
    expect(second.result?.skipped[0].reason).toContain("already exists");

    const count = await prisma.contact.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("two rows in the same file with the same email are only imported once", async () => {
    const dupeEmail = `dupe-in-file-${RUN_ID}@example.com`;
    const csv = `firstName,lastName,email\nSam,One,${dupeEmail}\nSam,Two,${dupeEmail}\n`;

    const result = await importContactsCsv({}, formDataFor(csv));
    expect(result.result?.imported).toBe(1);
    expect(result.result?.skipped).toHaveLength(1);
    expect(result.result?.skipped[0].reason).toContain("Duplicate email in this file");

    const count = await prisma.contact.count({ where: { email: dupeEmail } });
    expect(count).toBe(1);

    await prisma.contact.deleteMany({ where: { email: dupeEmail } });
  });

  it("business-only leads (no email) dedupe by business name", async () => {
    const csv = `businessName\n${businessName}\n`;

    const first = await importContactsCsv({}, formDataFor(csv));
    expect(first.result?.imported).toBe(1);

    const second = await importContactsCsv({}, formDataFor(csv));
    expect(second.result?.imported).toBe(0);
    expect(second.result?.skipped[0].reason).toContain("business name");

    const count = await prisma.contact.count({ where: { businessName } });
    expect(count).toBe(1);
  });

  it("person rows with no email dedupe by exact first+last name", async () => {
    const csv = `firstName,lastName\nDedup,Person${RUN_ID}\n`;

    const first = await importContactsCsv({}, formDataFor(csv));
    expect(first.result?.imported).toBe(1);

    const second = await importContactsCsv({}, formDataFor(csv));
    expect(second.result?.imported).toBe(0);
    expect(second.result?.skipped[0].reason).toContain("matched by name");
  });
});
