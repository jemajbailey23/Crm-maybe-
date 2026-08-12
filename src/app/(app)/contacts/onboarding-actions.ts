"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sendOnboardingForm } from "@/lib/onboarding";

// Manual Send/Resend button on the contact page — always (re)sends
// regardless of whether one went out before, unlike the automatic
// onlyIfNeverSent path triggered by a paid invoice.
export async function sendOnboardingFormAction(contactId: string): Promise<{ error?: string }> {
  await requireUser();
  const result = await sendOnboardingForm(contactId);
  if (!result.sent) return { error: result.error };
  revalidatePath(`/contacts/${contactId}`);
  return {};
}
