"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { WEEKDAY_LABELS, type AvailabilityRule } from "@/lib/availability";

export type AvailabilityState = { error?: string; success?: boolean };

const VALID_SLOT_MINUTES = [15, 30, 45, 60];

export async function updateAvailability(
  _prevState: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const user = await requireUser();

  const slotMinutes = Number(formData.get("slotMinutes"));
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!timezone) {
    return { error: "Choose a timezone." };
  }
  if (!VALID_SLOT_MINUTES.includes(slotMinutes)) {
    return { error: "Invalid slot duration." };
  }

  const rules: AvailabilityRule[] = [];
  for (let day = 0; day < 7; day++) {
    const enabled = formData.get(`enabled-${day}`) === "on";
    if (!enabled) continue;

    const start = String(formData.get(`start-${day}`) ?? "");
    const end = String(formData.get(`end-${day}`) ?? "");
    if (!start || !end) continue;
    if (start >= end) {
      return { error: `End time must be after start time for ${WEEKDAY_LABELS[day]}.` };
    }
    rules.push({ dayOfWeek: day, start, end });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      weeklyAvailability: rules,
      bookingSlotMinutes: slotMinutes,
      bookingTimezone: timezone,
    },
  });

  revalidatePath("/booking");
  revalidatePath("/book");
  return { success: true };
}
