"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type WebsiteInfoFormState = { error?: string };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function updateWebsiteInfo(
  contactId: string,
  _prevState: WebsiteInfoFormState,
  formData: FormData
): Promise<WebsiteInfoFormState> {
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      domain: str(formData, "domain"),
      hostingProvider: str(formData, "hostingProvider"),
      analyticsAccount: str(formData, "analyticsAccount"),
      googleSearchConsole: str(formData, "googleSearchConsole"),
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}
