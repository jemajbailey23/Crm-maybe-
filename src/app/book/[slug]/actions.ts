"use server";

import { revalidatePath } from "next/cache";
import { createBooking as createBookingEngine } from "@/lib/booking-engine";
import { bookingManageUrl } from "@/lib/booking-links";
import { prisma } from "@/lib/prisma";

export type BookingState = { error?: string; success?: boolean; manageUrl?: string };

export async function createBooking(
  meetingTypeSlug: string,
  _prevState: BookingState,
  formData: FormData
): Promise<BookingState> {
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visitorTimezone = String(formData.get("visitorTimezone") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

  if (!startsAtRaw || !name || !email) {
    return { error: "Please fill in your name, email, and pick a time." };
  }
  if (!idempotencyKey) {
    return { error: "Something went wrong preparing this form — please refresh and try again." };
  }

  // Intake answers arrive as intake_<questionId> fields.
  const intakeAnswers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("intake_") && typeof value === "string" && value.trim()) {
      intakeAnswers[key.slice("intake_".length)] = value.trim();
    }
  }

  const result = await createBookingEngine({
    meetingTypeSlug,
    startsAt: new Date(startsAtRaw),
    name,
    email,
    companyName: companyName || undefined,
    notes: notes || undefined,
    timezone: visitorTimezone || "UTC",
    intakeAnswers,
    idempotencyKey,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/booking");
  revalidatePath(`/book/${meetingTypeSlug}`);

  let manageUrl: string | undefined;
  if (result.manageToken) {
    const owner = await prisma.user.findFirst();
    if (owner) manageUrl = bookingManageUrl(owner, result.manageToken);
  }

  return { success: true, manageUrl };
}
