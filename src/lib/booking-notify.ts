import "server-only";
import type { Booking, MeetingType, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingManageUrl } from "@/lib/booking-links";
import {
  sendBookingConfirmationEmail,
  sendBookingOwnerNotification,
  sendBookingReminderEmail,
  sendBookingCancellationEmail,
} from "@/lib/mail";

// ---------------------------------------------------------------------
// Stage 7 — everything that sends mail for a booking, and the logging
// ("Confirmation sent" / "Reminder sent" / "Delivery failed") that goes
// with it. Kept separate from booking-engine.ts so the transactional
// create/reschedule/cancel logic never has to know about email — a broken
// mail provider must never fail (or roll back) an otherwise-successful
// booking.
// ---------------------------------------------------------------------

function substituteTokens(text: string, tokens: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => tokens[key] ?? match);
}

async function logBooking(
  type: "CONFIRMATION_SENT" | "REMINDER_SENT" | "DELIVERY_FAILED",
  message: string,
  bookingId: string
) {
  await prisma.bookingLog.create({ data: { type, message, bookingId } });
}

function defaultConfirmationBody(name: string, meetingTypeName: string, when: string) {
  return `Hi ${name},\n\nYou're confirmed for a ${meetingTypeName} on ${when}. We look forward to speaking with you.`;
}

/** Sends the visitor's confirmation email and the owner's internal
 * notification exactly once each, guarded by confirmationSentAt /
 * internalNotifiedAt so a caller accidentally invoking this twice for the
 * same booking never double-sends. Failures are logged, not thrown — the
 * booking itself is already committed by the time this runs. */
export async function notifyBookingCreated(
  booking: Booking,
  meetingType: MeetingType,
  owner: User,
  manageToken: string
) {
  const when = booking.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: booking.timezone,
  });
  const tokens = { name: booking.name, date: when, meetingType: meetingType.name };

  if (!booking.confirmationSentAt) {
    try {
      const subject = meetingType.confirmationSubject
        ? substituteTokens(meetingType.confirmationSubject, tokens)
        : `Confirmed: ${meetingType.name}`;
      const body = meetingType.confirmationBody
        ? substituteTokens(meetingType.confirmationBody, tokens)
        : defaultConfirmationBody(booking.name, meetingType.name, when);

      await sendBookingConfirmationEmail(booking.email, {
        subject,
        body,
        manageUrl: bookingManageUrl(owner, manageToken),
        cancellationPolicy: meetingType.cancellationPolicy,
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { confirmationSentAt: new Date() } });
      await logBooking("CONFIRMATION_SENT", `Confirmation sent to ${booking.email} for ${meetingType.name} on ${when}.`, booking.id);
    } catch (err) {
      console.error("[booking-notify] failed to send confirmation", err);
      await logBooking("DELIVERY_FAILED", `Confirmation to ${booking.email} failed: ${err instanceof Error ? err.message : "unknown error"}`, booking.id);
    }
  }

  if (!booking.internalNotifiedAt) {
    try {
      await sendBookingOwnerNotification(owner.email, {
        name: booking.name,
        email: booking.email,
        startsAt: booking.startsAt,
        notes: booking.notes,
        timezone: owner.bookingTimezone,
        meetingTypeName: meetingType.name,
        kind: "booked",
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { internalNotifiedAt: new Date() } });
    } catch (err) {
      console.error("[booking-notify] failed to send owner notification", err);
      await logBooking("DELIVERY_FAILED", `Internal notification for booking ${booking.id} failed: ${err instanceof Error ? err.message : "unknown error"}`, booking.id);
    }
  }
}

export async function notifyBookingRescheduled(
  newBooking: Booking,
  oldBooking: Booking,
  meetingType: MeetingType,
  owner: User,
  manageToken: string
) {
  const when = newBooking.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: newBooking.timezone,
  });
  const previousWhen = oldBooking.startsAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: oldBooking.timezone,
  });

  try {
    await sendBookingConfirmationEmail(newBooking.email, {
      subject: `Rescheduled: ${meetingType.name}`,
      body: `Hi ${newBooking.name},\n\nYour ${meetingType.name} has been moved from ${previousWhen} to ${when}.`,
      manageUrl: bookingManageUrl(owner, manageToken),
      cancellationPolicy: meetingType.cancellationPolicy,
    });
    await prisma.booking.update({ where: { id: newBooking.id }, data: { confirmationSentAt: new Date() } });
    await logBooking("CONFIRMATION_SENT", `Reschedule confirmation sent to ${newBooking.email} — moved to ${when}.`, newBooking.id);
  } catch (err) {
    console.error("[booking-notify] failed to send reschedule confirmation", err);
    await logBooking("DELIVERY_FAILED", `Reschedule confirmation to ${newBooking.email} failed: ${err instanceof Error ? err.message : "unknown error"}`, newBooking.id);
  }

  try {
    await sendBookingOwnerNotification(owner.email, {
      name: newBooking.name,
      email: newBooking.email,
      startsAt: newBooking.startsAt,
      notes: newBooking.notes,
      timezone: owner.bookingTimezone,
      meetingTypeName: meetingType.name,
      kind: "rescheduled",
    });
    await prisma.booking.update({ where: { id: newBooking.id }, data: { internalNotifiedAt: new Date() } });
  } catch (err) {
    console.error("[booking-notify] failed to send owner reschedule notification", err);
    await logBooking("DELIVERY_FAILED", `Internal reschedule notification for booking ${newBooking.id} failed: ${err instanceof Error ? err.message : "unknown error"}`, newBooking.id);
  }
}

export async function notifyBookingCancelled(booking: Booking, meetingType: MeetingType, owner: User) {
  try {
    await sendBookingCancellationEmail(booking.email, {
      name: booking.name,
      meetingTypeName: meetingType.name,
      startsAt: booking.startsAt,
      timezone: booking.timezone,
    });
  } catch (err) {
    console.error("[booking-notify] failed to send cancellation email", err);
    await logBooking("DELIVERY_FAILED", `Cancellation notice to ${booking.email} failed: ${err instanceof Error ? err.message : "unknown error"}`, booking.id);
  }

  try {
    await sendBookingOwnerNotification(owner.email, {
      name: booking.name,
      email: booking.email,
      startsAt: booking.startsAt,
      notes: booking.cancelReason,
      timezone: owner.bookingTimezone,
      meetingTypeName: meetingType.name,
      kind: "cancelled",
    });
  } catch (err) {
    console.error("[booking-notify] failed to send owner cancellation notification", err);
  }
}

// ---------------------------------------------------------------------
// Reminders — no background scheduler exists anywhere in this app (see
// the same limitation noted for Stage 6's reconciliation and the
// pre-existing checkOverdueTasks). This mirrors that established pattern:
// a lazy sweep, called opportunistically from page loads that already run
// on every real visit (dashboard, booking settings), rather than a true
// cron. A reminder can therefore be late by however long it's been since
// someone last opened one of those pages — documented as a known
// limitation, not silently glossed over.
// ---------------------------------------------------------------------

export async function sendDueBookingReminders(now: Date = new Date()) {
  const owner = await prisma.user.findFirst();
  if (!owner) return;

  const upcoming = await prisma.booking.findMany({
    where: { status: "CONFIRMED", startsAt: { gt: now } },
    include: { meetingType: true },
  });

  for (const booking of upcoming) {
    const hoursBeforeList = (booking.meetingType?.reminderHoursBefore as unknown as number[] | null) ?? [];
    if (hoursBeforeList.length === 0) continue;

    const alreadySent = new Set((booking.remindersSent as unknown as number[] | null) ?? []);
    const hoursUntilMeeting = (booking.startsAt.getTime() - now.getTime()) / (60 * 60 * 1000);

    for (const offset of hoursBeforeList) {
      if (alreadySent.has(offset)) continue;
      if (hoursUntilMeeting > offset) continue; // not due yet
      // If it's due AND the meeting hasn't already passed, send it — a
      // reminder that's overdue (e.g. the sweep didn't run for a while) is
      // still better sent late than never, as long as the meeting is
      // still in the future.

      try {
        await sendBookingReminderEmail(booking.email, {
          name: booking.name,
          meetingTypeName: booking.meetingType?.name ?? "your meeting",
          startsAt: booking.startsAt,
          timezone: booking.timezone,
          manageUrl: booking.manageToken ? bookingManageUrl(owner, booking.manageToken) : bookingManageUrl(owner, ""),
          hoursBefore: offset,
        });
        alreadySent.add(offset);
        await prisma.booking.update({
          where: { id: booking.id },
          data: { remindersSent: Array.from(alreadySent) },
        });
        await logBooking("REMINDER_SENT", `${offset}h reminder sent to ${booking.email} for ${booking.meetingType?.name ?? "meeting"} on ${booking.startsAt.toISOString()}.`, booking.id);
      } catch (err) {
        console.error("[booking-notify] failed to send reminder", err);
        await logBooking("DELIVERY_FAILED", `${offset}h reminder to ${booking.email} failed: ${err instanceof Error ? err.message : "unknown error"}`, booking.id);
      }
    }
  }
}
