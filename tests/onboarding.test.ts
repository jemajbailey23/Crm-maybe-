import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Client onboarding: a self-service form link (sent automatically on
// first payment, or manually from the contact page) and a dedicated
// agreement-document slot. Real DB, real server actions — only the
// genuinely external side effects are mocked: outbound email (nodemailer)
// and file storage (Supabase, via lib/storage).
type SentMail = { to?: string; subject?: string; text?: string; html?: string; [key: string]: unknown };
const sendMail = vi.fn<(opts: SentMail) => Promise<Record<string, never>>>(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
process.env.GMAIL_USER = "test@example.com";
process.env.GMAIL_APP_PASSWORD = "fake-app-password";

const uploadFile = vi.fn<(path: string, file: File) => Promise<string>>(
  async (path) => `https://fake-storage.example.com/${path}`
);
const deleteFile = vi.fn<(path: string) => Promise<void>>(async () => {});
vi.mock("@/lib/storage", () => ({
  uploadFile: (...args: Parameters<typeof uploadFile>) => uploadFile(...args),
  deleteFile: (...args: Parameters<typeof deleteFile>) => deleteFile(...args),
}));

// uploadAgreement/setAgreementSigned/removeAgreement/sendOnboardingFormAction
// all call requireUser(), which reads next/headers's cookies() — real
// outside an actual Next.js request, which a Vitest test isn't. The owner
// id isn't otherwise used by any of these actions, so a trivial stand-in
// is enough to exercise the real code path.
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: "test-owner" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { sendOnboardingForm } = await import("@/lib/onboarding");
const { submitOnboardingForm } = await import("@/app/onboard/[token]/actions");
const { updateInvoiceStatus } = await import("@/app/(app)/contacts/invoices-actions");
const { uploadAgreement, setAgreementSigned, removeAgreement } = await import(
  "@/app/(app)/contacts/agreement-actions"
);

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const createdContactIds: string[] = [];
const createdInvoiceIds: string[] = [];
const createdTaskIds: string[] = [];

async function makeContact(overrides: Partial<Parameters<typeof prisma.contact.create>[0]["data"]> = {}) {
  const contact = await prisma.contact.create({
    data: {
      firstName: "Ada",
      lastName: `Onboard-${RUN_ID}`,
      email: `onboard-${RUN_ID}-${createdContactIds.length}@example.com`,
      status: "CLIENT",
      ...overrides,
    },
  });
  createdContactIds.push(contact.id);
  return contact;
}

beforeEach(() => {
  sendMail.mockClear();
  uploadFile.mockClear();
  deleteFile.mockClear();
});

afterAll(async () => {
  // Real INVOICE_PAID automation rules in the dev DB (e.g. a
  // CREATE_TASK rule) may have fired for real during the invoice test
  // below — sweep up anything they left on our test contacts.
  const strayTasks = await prisma.task.findMany({ where: { contactId: { in: createdContactIds } } });
  await prisma.task.deleteMany({ where: { id: { in: [...createdTaskIds, ...strayTasks.map((t) => t.id)] } } });
  await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
});

describe("sendOnboardingForm", () => {
  it("generates a token, marks sentAt, and emails a link containing it", async () => {
    const contact = await makeContact();
    const result = await sendOnboardingForm(contact.id);
    expect(result.sent).toBe(true);

    const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.onboardingFormToken).toBeTruthy();
    expect(updated.onboardingFormSentAt).toBeTruthy();

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [call] = sendMail.mock.calls;
    expect(call[0].to).toBe(contact.email);
    expect(call[0].html).toContain(`/onboard/${updated.onboardingFormToken}`);
  });

  it("onlyIfNeverSent skips a contact that's already been sent one", async () => {
    const contact = await makeContact();
    const first = await sendOnboardingForm(contact.id, { onlyIfNeverSent: true });
    expect(first.sent).toBe(true);
    sendMail.mockClear();

    const second = await sendOnboardingForm(contact.id, { onlyIfNeverSent: true });
    expect(second.sent).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("fails clearly when the contact has no email on file", async () => {
    const contact = await makeContact({ email: null });
    const result = await sendOnboardingForm(contact.id);
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.error).toMatch(/no email/i);
  });
});

describe("submitOnboardingForm — public action", () => {
  it("writes the submitted fields onto the contact and sets submittedAt", async () => {
    const contact = await makeContact();
    const sendResult = await sendOnboardingForm(contact.id);
    expect(sendResult.sent).toBe(true);
    const afterSend = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    const token = afterSend.onboardingFormToken!;

    const formData = new FormData();
    formData.set("website", "https://example.com");
    formData.set("domain", "example.com");
    formData.set("hostingProvider", "Vercel");
    formData.set("address", "123 Main St");

    const result = await submitOnboardingForm(token, {}, formData);
    expect(result.success).toBe(true);

    const submitted = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(submitted.website).toBe("https://example.com");
    expect(submitted.domain).toBe("example.com");
    expect(submitted.hostingProvider).toBe("Vercel");
    expect(submitted.address).toBe("123 Main St");
    expect(submitted.onboardingFormSubmittedAt).toBeTruthy();
  });

  it("returns a clear error for an invalid/unknown token", async () => {
    const result = await submitOnboardingForm(`not-a-real-token-${RUN_ID}`, {}, new FormData());
    expect(result.error).toMatch(/isn't valid/i);
  });
});

describe("INVOICE_PAID — automatic onboarding form send", () => {
  it("sends once on first payment, not again on a second invoice", async () => {
    const contact = await makeContact();
    const invoice1 = await prisma.invoice.create({
      data: { contactId: contact.id, description: `Setup fee ${RUN_ID}`, amount: 500, status: "SENT" },
    });
    createdInvoiceIds.push(invoice1.id);

    await updateInvoiceStatus(invoice1.id, "PAID");
    const afterFirst = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(afterFirst.onboardingFormSentAt).toBeTruthy();
    expect(sendMail).toHaveBeenCalled();
    const firstToken = afterFirst.onboardingFormToken;

    sendMail.mockClear();
    const invoice2 = await prisma.invoice.create({
      data: { contactId: contact.id, description: `Month 2 ${RUN_ID}`, amount: 500, status: "SENT" },
    });
    createdInvoiceIds.push(invoice2.id);
    await updateInvoiceStatus(invoice2.id, "PAID");

    expect(sendMail).not.toHaveBeenCalled();
    const afterSecond = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(afterSecond.onboardingFormToken).toBe(firstToken);
  });
});

describe("Agreement document actions", () => {
  it("uploads a file, storing its info on the contact", async () => {
    const contact = await makeContact();
    const formData = new FormData();
    formData.set("file", new File(["contract contents"], "agreement.pdf", { type: "application/pdf" }));

    const result = await uploadAgreement(contact.id, {}, formData);
    expect(result.error).toBeUndefined();
    expect(uploadFile).toHaveBeenCalledTimes(1);

    const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.agreementFilename).toBe("agreement.pdf");
    expect(updated.agreementFileUrl).toContain("agreement.pdf");
    expect(updated.agreementUploadedAt).toBeTruthy();
    expect(updated.agreementSigned).toBe(false);
  });

  it("replacing a file deletes the old one from storage and resets signed", async () => {
    const contact = await makeContact();
    const firstUpload = new FormData();
    firstUpload.set("file", new File(["v1"], "v1.pdf", { type: "application/pdf" }));
    await uploadAgreement(contact.id, {}, firstUpload);
    await setAgreementSigned(contact.id, true);

    const secondUpload = new FormData();
    secondUpload.set("file", new File(["v2"], "v2.pdf", { type: "application/pdf" }));
    await uploadAgreement(contact.id, {}, secondUpload);

    expect(deleteFile).toHaveBeenCalledTimes(1);
    const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.agreementFilename).toBe("v2.pdf");
    expect(updated.agreementSigned).toBe(false);
  });

  it("toggles signed status", async () => {
    const contact = await makeContact();
    await setAgreementSigned(contact.id, true);
    let updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.agreementSigned).toBe(true);

    await setAgreementSigned(contact.id, false);
    updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.agreementSigned).toBe(false);
  });

  it("removes the file, clearing the fields and deleting from storage", async () => {
    const contact = await makeContact();
    const formData = new FormData();
    formData.set("file", new File(["contents"], "to-remove.pdf", { type: "application/pdf" }));
    await uploadAgreement(contact.id, {}, formData);

    await removeAgreement(contact.id);
    expect(deleteFile).toHaveBeenCalledTimes(1);

    const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(updated.agreementFileUrl).toBeNull();
    expect(updated.agreementFilename).toBeNull();
    expect(updated.agreementPath).toBeNull();
    expect(updated.agreementSigned).toBe(false);
  });

  it("rejects an empty submission with a clear error", async () => {
    const contact = await makeContact();
    const result = await uploadAgreement(contact.id, {}, new FormData());
    expect(result.error).toMatch(/choose a file/i);
  });
});
