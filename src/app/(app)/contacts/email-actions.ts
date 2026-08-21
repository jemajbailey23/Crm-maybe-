"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendAutomationEmail, isMailConfigured } from "@/lib/mail";

export type EmailFormState = { error?: string; success?: boolean };

// Manual, owner-composed email to one contact — distinct from the
// automated/templated sends elsewhere (password reset, booking
// confirmations, automation rules). Reuses sendAutomationEmail since it
// already sends owner-authored subject/body as-is (no escaping needed —
// that's only for third-party-supplied text going into HTML).
export async function sendContactEmail(
  contactId: string,
  _prevState: EmailFormState,
  formData: FormData
): Promise<EmailFormState> {
  const owner = await requireUser();
  if (!isMailConfigured()) {
    return { error: "Email isn't set up yet — add GMAIL_USER and GMAIL_APP_PASSWORD." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) return { error: "Subject and message are both required." };

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { error: "Contact not found." };
  if (!contact.email) return { error: "This contact doesn't have an email on file." };

  await sendAutomationEmail(contact.email, subject, body, owner.name);

  await prisma.activity.create({
    data: {
      type: "EMAIL",
      summary: `Sent email: "${subject}"`,
      contactId: contact.id,
      createdById: owner.id,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// Bulk version for the contacts list's "Email selected" action. Sends one
// message per contact (never a single email with everyone in to/cc — that
// would leak every recipient's address to every other recipient) and skips
// — rather than fails outright — any selected contact with no email on
// file, reporting the split back to the modal's completion summary.
export async function bulkSendContactEmail(
  ids: string[],
  values: Record<string, string>
): Promise<{ error?: string; info?: string }> {
  const owner = await requireUser();
  if (ids.length === 0) return { error: "No contacts selected." };
  if (!isMailConfigured()) {
    return { error: "Email isn't set up yet — add GMAIL_USER and GMAIL_APP_PASSWORD." };
  }

  const subject = (values.subject ?? "").trim();
  const body = (values.body ?? "").trim();
  if (!subject || !body) return { error: "Subject and message are both required." };

  const contacts = await prisma.contact.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true },
  });

  const recipients = contacts.filter((c) => c.email);
  if (recipients.length === 0) {
    return { error: "None of the selected contacts have an email on file." };
  }

  for (const contact of recipients) {
    await sendAutomationEmail(contact.email!, subject, body, owner.name);
  }

  await prisma.activity.createMany({
    data: recipients.map((c) => ({
      type: "EMAIL" as const,
      summary: `Sent email: "${subject}"`,
      contactId: c.id,
      createdById: owner.id,
    })),
  });

  revalidatePath("/contacts");
  for (const c of recipients) revalidatePath(`/contacts/${c.id}`);

  const skipped = ids.length - recipients.length;
  const info =
    skipped === 0
      ? `Sent to ${recipients.length} contact${recipients.length === 1 ? "" : "s"}.`
      : `Sent to ${recipients.length} of ${ids.length} — ${skipped} had no email on file.`;
  return { info };
}
