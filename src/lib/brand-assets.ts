import type { BrandAssetSlot } from "@prisma/client";

// Shared between the public onboarding wizard (src/app/onboard/[token]) and
// the owner-side brand panel (src/app/(app)/contacts) so the two views never
// drift out of sync on labels/options.
export const BRAND_ASSET_SLOTS: { slot: BrandAssetSlot; label: string; hint: string }[] = [
  { slot: "PRIMARY_LOGO", label: "Primary Logo", hint: "PNG, SVG" },
  { slot: "ALTERNATE_LOGO", label: "Alternate Logo", hint: "PNG, SVG" },
  { slot: "BRAND_GUIDELINES", label: "Brand Guidelines", hint: "PDF" },
  { slot: "BUSINESS_PHOTOS", label: "Business Photos", hint: "JPG, PNG" },
  { slot: "TEAM_PHOTOS", label: "Team Photos", hint: "JPG, PNG" },
  { slot: "PRODUCT_PHOTOS", label: "Product / Service Photos", hint: "JPG, PNG" },
  { slot: "VIDEO_ASSETS", label: "Video Assets", hint: "MP4" },
];

export const BRAND_VOICE_OPTIONS = [
  "Professional",
  "Friendly",
  "Premium",
  "Approachable",
  "Educational",
  "Bold",
  "Luxury",
  "Straightforward",
];

export const CONTACT_METHOD_OPTIONS = ["Email", "Phone", "Text"];
