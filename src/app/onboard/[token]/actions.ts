"use server";

import { prisma } from "@/lib/prisma";

export type OnboardingSubmitState = { error?: string; success?: boolean };

const FIELDS = [
  "website",
  "address",
  "googleBusinessProfile",
  "facebook",
  "instagram",
  "domain",
  "hostingProvider",
  "analyticsAccount",
  "googleSearchConsole",
] as const;

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

// No auth — the token itself (a 256-bit random value, same convention as
// the booking manage link) is what grants access. Doesn't consume/expire
// the token on submit: the client may come back to update an answer
// later, same as the booking manage link stays usable after first use.
export async function submitOnboardingForm(
  token: string,
  _prevState: OnboardingSubmitState,
  formData: FormData
): Promise<OnboardingSubmitState> {
  const contact = await prisma.contact.findUnique({ where: { onboardingFormToken: token } });
  if (!contact) {
    return { error: "This link isn't valid — it may have been replaced by a newer one." };
  }

  const data = Object.fromEntries(FIELDS.map((f) => [f, str(formData, f)]));

  await prisma.contact.update({
    where: { id: contact.id },
    data: { ...data, onboardingFormSubmittedAt: new Date() },
  });

  return { success: true };
}
