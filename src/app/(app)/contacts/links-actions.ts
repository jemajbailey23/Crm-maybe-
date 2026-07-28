"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type LinkFormState = { error?: string };

export async function addLink(
  contactId: string,
  _prevState: LinkFormState,
  formData: FormData
): Promise<LinkFormState> {
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!label || !url) return { error: "Label and URL are both required." };

  await prisma.importantLink.create({ data: { contactId, label, url } });
  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function deleteLink(linkId: string) {
  const link = await prisma.importantLink.delete({ where: { id: linkId } });
  revalidatePath(`/contacts/${link.contactId}`);
}
