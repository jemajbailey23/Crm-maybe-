import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Manual, owner-composed email to one or many contacts (Send email panel
// on a contact page; "Email selected" bulk action on the contacts list).
// Real DB, real server actions — only nodemailer (genuinely external) and
// @/lib/auth's requireUser (no real Next.js request context in Vitest) are
// mocked.
type SentMail = { to?: string; subject?: string; text?: string; html?: string; from?: string; [key: string]: unknown };
const sendMail = vi.fn<(opts: SentMail) => Promise<Record<string, never>>>(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
process.env.GMAIL_USER = "test@example.com";
process.env.GMAIL_APP_PASSWORD = "fake-app-password";

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const createdContactIds: string[] = [];

// Fetched eagerly (top-level await) rather than inside a test, so it's
// available the moment the first test calls requireUser() — vi.mock's
// factory only actually runs lazily, on the module's first import below,
// not at hoist time, so this ordering is safe.
const ownerId = (await prisma.user.findFirstOrThrow({ select: { id: true } })).id;
vi.mock("@/lib/auth", () => ({
  // requireUser's id is written as Activity.createdById, a real FK to
  // User — so the mock resolves to an actually-seeded row rather than a
  // made-up string, or every create() below would fail the constraint.
  requireUser: async () => ({ id: ownerId, name: "Test Owner" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { sendContactEmail, bulkSendContactEmail } = await import("@/app/(app)/contacts/email-actions");

async function makeContact(overrides: Partial<Parameters<typeof prisma.contact.create>[0]["data"]> = {}) {
  const contact = await prisma.contact.create({
    data: {
      firstName: "Ada",
      lastName: `Email-${RUN_ID}`,
      email: `email-${RUN_ID}-${createdContactIds.length}@example.com`,
      status: "LEAD",
      ...overrides,
    },
  });
  createdContactIds.push(contact.id);
  return contact;
}

beforeEach(() => {
  sendMail.mockClear();
});

afterAll(async () => {
  await prisma.activity.deleteMany({ where: { contactId: { in: createdContactIds } } });
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
});

describe("sendContactEmail", () => {
  it("sends the email and logs it as an EMAIL activity on the contact", async () => {
    const contact = await makeContact();

    const formData = new FormData();
    formData.set("subject", "Following up");
    formData.set("body", "Just checking in on last week's quote.");

    const result = await sendContactEmail(contact.id, {}, formData);
    expect(result.success).toBe(true);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [call] = sendMail.mock.calls;
    expect(call[0].to).toBe(contact.email);
    expect(call[0].subject).toBe("Following up");
    expect(call[0].text).toBe("Just checking in on last week's quote.");

    const activity = await prisma.activity.findFirstOrThrow({ where: { contactId: contact.id } });
    expect(activity.type).toBe("EMAIL");
    expect(activity.summary).toContain("Following up");
    expect(activity.createdById).toBe(ownerId);
  });

  it("rejects a contact with no email on file", async () => {
    const contact = await makeContact({ email: null });
    const formData = new FormData();
    formData.set("subject", "Hi");
    formData.set("body", "Hello there");

    const result = await sendContactEmail(contact.id, {}, formData);
    expect(result.error).toMatch(/doesn't have an email/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects an empty subject or body", async () => {
    const contact = await makeContact();
    const formData = new FormData();
    formData.set("subject", "");
    formData.set("body", "");

    const result = await sendContactEmail(contact.id, {}, formData);
    expect(result.error).toMatch(/required/i);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("bulkSendContactEmail", () => {
  it("sends one email per contact and logs an activity for each", async () => {
    const contactA = await makeContact();
    const contactB = await makeContact();

    const result = await bulkSendContactEmail([contactA.id, contactB.id], {
      subject: "Spring special",
      body: "20% off this month.",
    });

    expect(result.error).toBeUndefined();
    expect(result.info).toMatch(/sent to 2 contacts/i);
    expect(sendMail).toHaveBeenCalledTimes(2);

    // Never puts multiple recipients on one email — each send targets
    // exactly one contact, so no recipient sees another's address.
    const recipients = sendMail.mock.calls.map((c) => c[0].to);
    expect(new Set(recipients)).toEqual(new Set([contactA.email, contactB.email]));

    const activities = await prisma.activity.findMany({
      where: { contactId: { in: [contactA.id, contactB.id] } },
    });
    expect(activities).toHaveLength(2);
    expect(activities.every((a) => a.type === "EMAIL")).toBe(true);
  });

  it("skips contacts with no email and reports the split", async () => {
    const withEmail = await makeContact();
    const withoutEmail = await makeContact({ email: null });

    const result = await bulkSendContactEmail([withEmail.id, withoutEmail.id], {
      subject: "Hi",
      body: "Hello",
    });

    expect(result.error).toBeUndefined();
    expect(result.info).toMatch(/sent to 1 of 2.*1 had no email/i);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe(withEmail.email);
  });

  it("errors clearly when none of the selected contacts have an email", async () => {
    const contact = await makeContact({ email: null });

    const result = await bulkSendContactEmail([contact.id], { subject: "Hi", body: "Hello" });
    expect(result.error).toMatch(/none of the selected contacts/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects an empty selection", async () => {
    const result = await bulkSendContactEmail([], { subject: "Hi", body: "Hello" });
    expect(result.error).toMatch(/no contacts selected/i);
  });
});
