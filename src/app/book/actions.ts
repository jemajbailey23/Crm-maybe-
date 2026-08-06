"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateAvailableSlots, type AvailabilityRule } from "@/lib/availability";
import { sendBookingOwnerNotification } from "@/lib/mail";
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

  try {
    await prisma.booking.create({
      data: { startsAt, endsAt, name, email, notes: notes || null, contactId: contact.id },
    });
  } catch (err) {
    // Someone else grabbed this exact slot between the availability check
    // above and this insert (Booking.startsAt is unique at the DB level
    // specifically to catch this race) — ask them to pick another time
    // instead of showing a raw error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That time was just booked by someone else. Please pick another." };
    }
    throw err;
  }

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

  // The booking itself is already saved at this point — a broken email
  // provider (bad Gmail credentials, etc.) should never take down the
  // booking confirmation for the visitor. Log and move on. (The visitor's
  // own confirmation email is sent below via the automation system, not
  // here — see the "Booking confirmation to client" automation.)
  try {
    await sendBookingOwnerNotification(owner.email, {
      name,
      email,
      startsAt,
      notes: notes || null,
      timezone: owner.bookingTimezone,
    });
  } catch (err) {
    console.error("[booking] failed to send owner notification email", err);
  }

  revalidatePath("/booking");
  revalidatePath("/book");

  const when = startsAt.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: visitorTimezone || owner.bookingTimezone,
    timeZoneName: "short",
  });

  await fireAutomationTrigger("APPOINTMENT_BOOKED", {
    contactId: contact.id,
    summary: `${name} booked a call for ${startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    variables: { date: when },
  });

  return { success: true };
}
