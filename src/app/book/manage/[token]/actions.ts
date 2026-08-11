"use server";

import { revalidatePath } from "next/cache";
import { cancelBookingByToken, rescheduleBooking } from "@/lib/booking-engine";

export type ManageState = { error?: string; success?: boolean };

export async function cancelBookingAction(
  token: string,
  _prevState: ManageState,
  formData: FormData
): Promise<ManageState> {
  const reason = String(formData.get("reason") ?? "").trim();
  const result = await cancelBookingByToken(token, reason || undefined);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/book/manage/${token}`);
  revalidatePath("/booking");
  return { success: true };
}

export type RescheduleState = { error?: string; success?: boolean; newManageUrl?: string };

export async function rescheduleBookingAction(
  token: string,
  _prevState: RescheduleState,
  formData: FormData
): Promise<RescheduleState> {
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  if (!startsAtRaw) return { error: "Pick a new time." };

  const result = await rescheduleBooking(token, new Date(startsAtRaw));
  if (!result.ok) return { error: result.error };

  revalidatePath(`/book/manage/${token}`);
  revalidatePath(`/book/manage/${result.manageToken}`);
  revalidatePath("/booking");
  return { success: true, newManageUrl: `/book/manage/${result.manageToken}` };
}
