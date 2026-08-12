"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

export type BrandVoiceFormState = { error?: string };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

// Same fields as the public wizard's Brand Assets step — editable here
// too, e.g. if the owner wants to fill these in ahead of the client, or
// tidy up what the client wrote.
export async function updateBrandVoice(
  contactId: string,
  _prevState: BrandVoiceFormState,
  formData: FormData
): Promise<BrandVoiceFormState> {
  await requireUser();

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      brandVoice: str(formData, "brandVoice"),
      brandDescription: str(formData, "brandDescription"),
      brandDifferentiators: str(formData, "brandDifferentiators"),
      brandAvoidWords: str(formData, "brandAvoidWords"),
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

// Lets the owner prune a file the client uploaded (wrong file, wrong
// slot, etc.) without needing database access.
export async function deleteBrandAsset(contactId: string, assetId: string) {
  await requireUser();

  const asset = await prisma.brandAsset.findFirst({ where: { id: assetId, contactId } });
  if (!asset) return;

  await prisma.brandAsset.delete({ where: { id: asset.id } });
  await deleteFile(asset.path).catch(() => {});
  revalidatePath(`/contacts/${contactId}`);
}
