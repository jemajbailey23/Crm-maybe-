import "server-only";
import type { User } from "@prisma/client";

// Stage 7: "Support a branded booking URL configuration. Do not display
// the raw Vercel URL to prospects when a branded URL is configured."
// Pointing an actual custom domain at this deployment is a step the owner
// takes in Vercel's dashboard, outside this app's code — this module only
// controls what URL gets displayed/emailed to prospects once that's done,
// so the raw APP_URL never leaks into anything client-facing when a
// branded URL has been set.
export function getPublicBookingBaseUrl(owner: Pick<User, "bookingBrandedUrl">): string {
  const branded = owner.bookingBrandedUrl?.trim();
  const base = branded || process.env.APP_URL || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export function bookingTypeUrl(owner: Pick<User, "bookingBrandedUrl">, slug: string): string {
  return `${getPublicBookingBaseUrl(owner)}/book/${slug}`;
}

export function bookingManageUrl(owner: Pick<User, "bookingBrandedUrl">, token: string): string {
  return `${getPublicBookingBaseUrl(owner)}/book/manage/${token}`;
}
