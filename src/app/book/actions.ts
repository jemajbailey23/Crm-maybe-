"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateAvailableSlots, type AvailabilityRule } from "@/lib/availability";
import { sendBookingOwnerNotification, sendBookingConfirmation } from "@/lib/mail";
import { fireAutomationTrigger } from "@/lib/automations";

export type BookingState = { error?: string; success?: boolean };

export async function createBooking(
  _prevState: BookingState,
  formData: FormData
): Promise<BookingState> {
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();
  const visitorTimezone = String(formData.get("visitorTimezone") ?? "").trim();

  if (!startsAtRaw || !name || !email) {
    return { error: "Please fill in your name, email, and pick a time." };
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
    return { error: "That time is no longer available. Please pick another." };
  }

  const owner = await prisma.user.findFirst();
  if (!owner) {
    return { error: "Booking isn't set up yet." };
  }

  const rules = (owner.weeklyAvailability as unknown as AvailabilityRule[] | null) ?? [];
  const existingBookings = await prisma.booking.findMany({
    where: { startsAt: { gte: new Date() } },
    select: { startsAt: true, endsAt: true },
  });

  const validSlots = generateAvailableSlots({
    rules,
    slotMinutes: owner.bookingSlotMinutes,
    timezone: owner.bookingTimezone,
    existingBookings,
  });
  const isValidSlot = validSlots.some((slot) => slot.getTime() === startsAt.getTime());
  if (!isValidSlot) {
    return { error: "That time is no longer available. Please pick another." };
  }

  const endsAt = new Date(startsAt.getTime() + owner.bookingSlotMinutes * 60000);

  let contact = await prisma.contact.findFirst({ where: { email } });
  if (!contact) {
    const [firstName, ...rest] = name.split(" ");
    contact = await prisma.contact.create({
      data: {
        firstName: firstName || name,
        lastName: rest.join(" ") || "-",
        email,
      },
    });
  }

  await prisma.booking.create({
    data: { startsAt, endsAt, name, email, notes: notes || null, contactId: contact.id },
  });

  await prisma.task.create({
    data: {
      title: `Call with ${name}`,
      dueDate: startsAt,
      contactId: contact.id,
      assignedToId: owner.id,
      notes: notes || null,
    },
  });

  await prisma.activity.create({
    data: {
      type: "MEETING",
      summary: `Booked a call for ${startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: owner.bookingTimezone })}`,
      contactId: contact.id,
      createdById: owner.id,
    },
  });

  await Promise.all([
    sendBookingOwnerNotification(owner.email, {
      name,
      email,
      startsAt,
      notes: notes || null,
      timezone: owner.bookingTimezone,
    }),
    sendBookingConfirmation(email, {
      name,
      startsAt,
      timezone: visitorTimezone || owner.bookingTimezone,
    }),
  ]);

  revalidatePath("/booking");
  revalidatePath("/book");

  await fireAutomationTrigger("APPOINTMENT_BOOKED", {
    contactId: contact.id,
    summary: `${name} booked a call for ${startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
  });

  return { success: true };
}
