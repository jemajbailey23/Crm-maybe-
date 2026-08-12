import "server-only";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendOnboardingFormEmail } from "@/lib/mail";

export function onboardingFormUrl(token: string): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/onboard/${token}`;
}

export type SendOnboardingFormResult = { sent: true } | { sent: false; error: string };

/** Sends (or re-sends) the client's self-service onboarding form link —
 * used both by the automatic "just paid" trigger and the manual
 * Send/Resend button on the contact page. Always issues a fresh token, so
 * a resend invalidates whatever link was sent before.
 *
 * Returns a result instead of throwing, since the two call sites need to
 * handle failure differently: the automatic path should log and move on
 * (an invoice getting marked paid must never fail because a contact has
 * no email on file), while the manual button surfaces the error directly. */
export async function sendOnboardingForm(
  contactId: string,
  opts: { onlyIfNeverSent?: boolean } = {}
): Promise<SendOnboardingFormResult> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { sent: false, error: "Contact not found." };
  if (opts.onlyIfNeverSent && contact.onboardingFormSentAt) return { sent: false, error: "Already sent." };
  if (!contact.email) return { sent: false, error: "This contact has no email address on file." };

  const owner = await prisma.user.findFirst();
  const token = generateToken();

  await prisma.contact.update({
    where: { id: contactId },
    data: { onboardingFormToken: token, onboardingFormSentAt: new Date() },
  });

  await sendOnboardingFormEmail(contact.email, {
    name: contact.firstName || contact.businessName || contact.lastName || "there",
    formUrl: onboardingFormUrl(token),
    ownerName: owner?.name,
  });

  return { sent: true };
}
