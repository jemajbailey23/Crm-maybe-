"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
import { BRAND_ASSET_SLOTS } from "@/lib/brand-assets";
import { BrandAssetSlot } from "@prisma/client";

export type StepState = { error?: string; success?: boolean };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

// No auth on any action in this file — the token itself (a 256-bit random
// value, same convention as the booking manage link) is what grants
// access. Nothing here consumes/expires the token: the client can come
// back through the same link to update an answer or add another file,
// same as the booking manage link stays usable after first use.
async function findContactByToken(token: string) {
  return prisma.contact.findUnique({ where: { onboardingFormToken: token } });
}

const BUSINESS_FIELDS = [
  "legalBusinessName",
  "serviceAreas",
  "yearsInBusiness",
  "businessHours",
  "title",
  "preferredContactMethod",
] as const;

// Step 1 — deliberately excludes firstName/lastName/email/businessName:
// those double as Stripe-customer-matching/contact-identity fields
// elsewhere in the app, so they're shown read-only in the form rather
// than writable through a public, no-login page.
export async function saveBusinessProfile(
  token: string,
  _prevState: StepState,
  formData: FormData
): Promise<StepState> {
  const contact = await findContactByToken(token);
  if (!contact) return { error: "This link isn't valid — it may have been replaced by a newer one." };

  const data = Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, str(formData, f)]));
  await prisma.contact.update({ where: { id: contact.id }, data });
  revalidatePath(`/contacts/${contact.id}`);
  return { success: true };
}

const PLATFORM_FIELDS = [
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

// Step 2 — the same fields the original single-page form collected.
export async function savePlatformAccess(
  token: string,
  _prevState: StepState,
  formData: FormData
): Promise<StepState> {
  const contact = await findContactByToken(token);
  if (!contact) return { error: "This link isn't valid — it may have been replaced by a newer one." };

  const data = Object.fromEntries(PLATFORM_FIELDS.map((f) => [f, str(formData, f)]));
  await prisma.contact.update({ where: { id: contact.id }, data });
  revalidatePath(`/contacts/${contact.id}`);
  return { success: true };
}

// Step 3's free-text half — the uploaded files themselves are handled by
// uploadBrandAsset/removeBrandAsset below.
export async function saveBrandVoice(
  token: string,
  _prevState: StepState,
  formData: FormData
): Promise<StepState> {
  const contact = await findContactByToken(token);
  if (!contact) return { error: "This link isn't valid — it may have been replaced by a newer one." };

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      brandVoice: str(formData, "brandVoice"),
      brandDescription: str(formData, "brandDescription"),
      brandDifferentiators: str(formData, "brandDifferentiators"),
      brandAvoidWords: str(formData, "brandAvoidWords"),
    },
  });
  revalidatePath(`/contacts/${contact.id}`);
  return { success: true };
}

const VALID_SLOTS: BrandAssetSlot[] = BRAND_ASSET_SLOTS.map((s) => s.slot);

export async function uploadBrandAsset(
  token: string,
  slot: BrandAssetSlot,
  formData: FormData
): Promise<{ error?: string }> {
  if (!VALID_SLOTS.includes(slot)) return { error: "Unknown upload slot." };

  const contact = await findContactByToken(token);
  if (!contact) return { error: "This link isn't valid — it may have been replaced by a newer one." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };

  const path = `brand-assets/${contact.id}/${randomUUID()}-${file.name}`;
  let url: string;
  try {
    url = await uploadFile(path, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await prisma.brandAsset.create({
    data: {
      contactId: contact.id,
      slot,
      filename: file.name,
      url,
      path,
      sizeBytes: file.size,
      mimeType: file.type || null,
    },
  });
  revalidatePath(`/contacts/${contact.id}`);
  return {};
}

export async function removeBrandAsset(token: string, assetId: string) {
  const contact = await findContactByToken(token);
  if (!contact) return;

  // Scoped to this token's own contact so one onboarding link can't
  // remove another contact's file by guessing an asset id.
  const asset = await prisma.brandAsset.findFirst({ where: { id: assetId, contactId: contact.id } });
  if (!asset) return;

  await prisma.brandAsset.delete({ where: { id: asset.id } });
  await deleteFile(asset.path).catch(() => {});
  revalidatePath(`/contacts/${contact.id}`);
}

// The final "Submit" — everything else already saved incrementally as the
// client moved through each step, so this just marks the form complete.
export async function completeOnboarding(token: string): Promise<StepState> {
  const contact = await findContactByToken(token);
  if (!contact) return { error: "This link isn't valid — it may have been replaced by a newer one." };

  await prisma.contact.update({
    where: { id: contact.id },
    data: { onboardingFormSubmittedAt: new Date() },
  });
  revalidatePath(`/contacts/${contact.id}`);
  return { success: true };
}
