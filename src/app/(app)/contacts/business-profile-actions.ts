"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type BusinessProfileFormState = { error?: string };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

// Same fields the client fills in on step 1 of the public onboarding
// wizard — editable here too, for whenever the owner has the answer
// before (or instead of) the client submitting it themselves.
export async function updateBusinessProfile(
  contactId: string,
  _prevState: BusinessProfileFormState,
  formData: FormData
): Promise<BusinessProfileFormState> {
  await requireUser();

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      legalBusinessName: str(formData, "legalBusinessName"),
      serviceAreas: str(formData, "serviceAreas"),
      yearsInBusiness: str(formData, "yearsInBusiness"),
      businessHours: str(formData, "businessHours"),
      preferredContactMethod: str(formData, "preferredContactMethod"),
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}
