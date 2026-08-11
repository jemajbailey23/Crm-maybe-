"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseWeeklyAvailability } from "./weekly-availability-fields";
import { cancelBookingAsOwner, markBookingCompleted, markBookingNoShow } from "@/lib/booking-engine";

export type AvailabilityState = { error?: string; success?: boolean };

export async function updateAvailability(
  _prevState: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const user = await requireUser();

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!timezone) {
    return { error: "Choose a timezone." };
  }

  const rules = parseWeeklyAvailability(formData, "");
  if ("error" in rules) return { error: rules.error };

  await prisma.user.update({
    where: { id: user.id },
    data: { weeklyAvailability: rules, bookingTimezone: timezone },
  });

  revalidatePath("/booking");
  revalidatePath("/book");
  return { success: true };
}

export type BrandedUrlState = { error?: string; success?: boolean };

export async function updateBrandedUrl(
  _prevState: BrandedUrlState,
  formData: FormData
): Promise<BrandedUrlState> {
  const user = await requireUser();
  const raw = String(formData.get("brandedUrl") ?? "").trim();

  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "Enter a full URL starting with http:// or https://." };
      }
    } catch {
      return { error: "Enter a full URL, e.g. https://book.yourdomain.com." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bookingBrandedUrl: raw || null },
  });

  revalidatePath("/booking");
  return { success: true };
}

export async function cancelBookingOwner(bookingId: string, reason?: string) {
  await cancelBookingAsOwner(bookingId, reason);
  revalidatePath("/booking");
}

export async function completeBookingOwner(bookingId: string) {
  await markBookingCompleted(bookingId);
  revalidatePath("/booking");
}

export async function noShowBookingOwner(bookingId: string) {
  await markBookingNoShow(bookingId);
  revalidatePath("/booking");
}
