import "server-only";
import { addMinutes } from "date-fns";
import { Prisma, type Booking, type MeetingType, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { generateAvailableSlots, type AvailabilityRule, type BufferedRange } from "@/lib/availability";
import { fireAutomationTrigger } from "@/lib/automations";
import { STAGE_ORDER } from "@/lib/pipeline-stages";
import { notifyBookingCreated, notifyBookingRescheduled, notifyBookingCancelled } from "@/lib/booking-notify";

// ---------------------------------------------------------------------
// Stage 7 — Booking Reliability. This module is the single place booking
// lifecycle transitions happen (create / reschedule / cancel / complete /
// no-show), so every rule the spec calls for ("prevent overlapping
// appointments," "restore a slot after cancellation," "do not restore a
// slot after rescheduling until the new booking succeeds," "trigger
// confirmation once," etc.) is enforced in exactly one place rather than
// duplicated across the public form action and the owner-side actions.
// ---------------------------------------------------------------------

// Bookings in these statuses no longer hold their slot — a CANCELLED or
// RESCHEDULED booking's time is available again for someone else.
const NON_BLOCKING_STATUSES: Booking["status"][] = ["CANCELLED", "RESCHEDULED"];

class BookingConflictError extends Error {
  constructor() {
    super("That time was just booked by someone else.");
  }
}

function isConflictError(err: unknown): boolean {
  if (err instanceof BookingConflictError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return true;
  // Postgres serialization failure (40001) / deadlock (40P01) surfaced
  // through a raw error when the Serializable transaction below can't be
  // committed because a concurrent request touched an overlapping range —
  // this is Postgres itself catching the race, not our own check.
  if (err instanceof Error && /could not serialize|deadlock detected/i.test(err.message)) return true;
  return false;
}

async function logBooking(
  type: "CONFIRMATION_SENT" | "REMINDER_SENT" | "DELIVERY_FAILED" | "BOOKING_CONFLICT" | "DUPLICATE_PREVENTED",
  message: string,
  bookingId: string | null
) {
  await prisma.bookingLog.create({ data: { type, message, bookingId } });
}

/** Resolves the availability rules a meeting type actually uses — its own
 * override if set, otherwise the owner's default weekly availability.
 *
 * Bugfix: this used to treat an override of `[]` (every day explicitly
 * disabled) the same as "no override configured," silently falling back
 * to the owner's default hours — so an owner trying to pause bookings for
 * just one meeting type by unchecking every day found it stayed fully
 * bookable. `[]` is a real, deliberate value (zero availability) and is
 * only equivalent to "no override" when it's actually `null`. */
export function resolveAvailabilityRules(meetingType: MeetingType, owner: User): AvailabilityRule[] {
  const override = meetingType.weeklyAvailability as unknown as AvailabilityRule[] | null;
  if (override !== null && override !== undefined) return override;
  return (owner.weeklyAvailability as unknown as AvailabilityRule[] | null) ?? [];
}

async function getBlockingBookingRanges(excludeBookingId?: string): Promise<BufferedRange[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: { notIn: NON_BLOCKING_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { bufferedStartsAt: true, bufferedEndsAt: true },
  });
  return rows;
}

/** Every open slot for one meeting type, respecting the owner's (or the
 * type's own override) availability, disabled days, buffers, minimum
 * notice, and maximum advance window — all in one pass. Pass
 * `excludeBookingId` when generating slots to reschedule an existing
 * booking into, so that booking's own (about-to-move) time doesn't count
 * against itself. */
export async function getAvailableSlotsForType(
  meetingType: MeetingType,
  owner: User,
  now: Date = new Date(),
  excludeBookingId?: string
): Promise<Date[]> {
  const rules = resolveAvailabilityRules(meetingType, owner);
  const existingBookings = await getBlockingBookingRanges(excludeBookingId);

  return generateAvailableSlots({
    rules,
    slotMinutes: meetingType.durationMinutes,
    timezone: owner.bookingTimezone,
    existingBookings,
    bufferBeforeMinutes: meetingType.bufferBeforeMinutes,
    bufferAfterMinutes: meetingType.bufferAfterMinutes,
    minNoticeHours: meetingType.minNoticeHours,
    maxAdvanceDays: meetingType.maxAdvanceDays,
    now,
  });
}

function contactDisplayName(c: { firstName: string; lastName: string; businessName: string | null }) {
  return c.businessName || `${c.firstName} ${c.lastName}`.trim();
}

async function findOrCreateContact(tx: Prisma.TransactionClient, email: string, name: string) {
  const existing = await tx.contact.findFirst({ where: { email } });
  if (existing) return existing;

  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(" ") || "-";
  return tx.contact.create({ data: { firstName, lastName, email } });
}

async function findOrCreateCompany(tx: Prisma.TransactionClient, companyName: string, contactId: string) {
  const trimmed = companyName.trim();
  if (!trimmed) return null;

  let company = await tx.company.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
  if (!company) {
    company = await tx.company.create({ data: { name: trimmed } });
  }

  const contact = await tx.contact.findUnique({ where: { id: contactId }, select: { companyId: true } });
  if (contact && !contact.companyId) {
    await tx.contact.update({ where: { id: contactId }, data: { companyId: company.id } });
  }

  return company;
}

// Never downgrade a deal that's already further along than the meeting
// type's related stage — booking a second Discovery Call for a contact
// already in Negotiation shouldn't yank the deal backward. NURTURE is a
// holding stage rather than genuine progress, so any fresh meeting pulls
// a deal back into the active pipeline.
function shouldAdvanceStage(currentStage: string, targetStage: string): boolean {
  if (currentStage === "WON" || currentStage === "LOST") return false;
  if (currentStage === "NURTURE") return true;
  const currentIndex = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number]);
  const targetIndex = STAGE_ORDER.indexOf(targetStage as (typeof STAGE_ORDER)[number]);
  return targetIndex > currentIndex;
}

const OPEN_DEAL_STAGES_EXCLUDE = ["WON", "LOST"] as const;

async function findOrConnectDeal(
  tx: Prisma.TransactionClient,
  params: {
    contactId: string;
    companyId: string | null;
    ownerId: string;
    meetingType: MeetingType;
    meetingDate: Date;
    contactName: string;
  }
) {
  const { contactId, companyId, ownerId, meetingType, meetingDate, contactName } = params;

  const existingDeal = await tx.deal.findFirst({
    where: { contactId, stage: { notIn: [...OPEN_DEAL_STAGES_EXCLUDE] } },
    orderBy: { createdAt: "desc" },
  });

  if (existingDeal) {
    const data: Prisma.DealUpdateInput = { meetingDate };
    if (meetingType.relatedDealStage && shouldAdvanceStage(existingDeal.stage, meetingType.relatedDealStage)) {
      data.stage = meetingType.relatedDealStage;
      data.stageEnteredAt = new Date();
    }
    return tx.deal.update({ where: { id: existingDeal.id }, data });
  }

  return tx.deal.create({
    data: {
      title: `${meetingType.name} — ${contactName}`,
      stage: meetingType.relatedDealStage ?? "NEW_LEAD",
      contactId,
      companyId,
      assignedToId: ownerId,
      meetingDate,
      leadSource: "Booking",
    },
  });
}

// ---------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------

export type CreateBookingInput = {
  meetingTypeSlug: string;
  startsAt: Date;
  name: string;
  email: string;
  companyName?: string;
  notes?: string;
  timezone: string;
  intakeAnswers?: Record<string, string>;
  idempotencyKey: string;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking; manageToken: string | null; meetingType: MeetingType }
  | { ok: false; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const meetingType = await prisma.meetingType.findUnique({ where: { slug: input.meetingTypeSlug } });
  if (!meetingType || !meetingType.isActive) {
    return { ok: false, error: "This meeting type isn't available right now." };
  }

  // Duplicate-submission guard: a resubmitted idempotency key (double
  // click, a retried network request) returns the original booking
  // instead of validating/creating a second one — validation could even
  // spuriously fail on retry (e.g. the slot looks "in the past" a few
  // seconds later), so this has to run before any other check.
  if (input.idempotencyKey) {
    const existing = await prisma.booking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      await logBooking(
        "DUPLICATE_PREVENTED",
        `Duplicate submission for ${existing.email} at ${existing.startsAt.toISOString()} was ignored.`,
        existing.id
      );
      return { ok: true, booking: existing, manageToken: null, meetingType };
    }
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) {
    return { ok: false, error: "Please fill in your name and email." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const now = new Date();
  if (Number.isNaN(input.startsAt.getTime()) || input.startsAt.getTime() < now.getTime()) {
    return { ok: false, error: "That time is in the past. Please pick another." };
  }

  const owner = await prisma.user.findFirst();
  if (!owner) return { ok: false, error: "Booking isn't set up yet." };

  const questions = (meetingType.intakeQuestions as unknown as
    | { id: string; label: string; required: boolean }[]
    | null) ?? [];
  for (const q of questions) {
    if (q.required && !input.intakeAnswers?.[q.id]?.trim()) {
      return { ok: false, error: `Please answer: ${q.label}` };
    }
  }

  // Re-derive the valid slot list server-side (never trust a client-sent
  // startsAt without checking it against real availability + buffers +
  // notice/advance window) — this is the same generator the picker used
  // to render options, so "respect owner availability," "respect
  // buffers," "respect disabled days," "prevent booking in the past," and
  // minimum-notice/maximum-advance are all enforced by this one call.
  const slots = await getAvailableSlotsForType(meetingType, owner, now);
  const isValidSlot = slots.some((s) => s.getTime() === input.startsAt.getTime());
  if (!isValidSlot) {
    await logBooking(
      "BOOKING_CONFLICT",
      `Attempted booking for ${email} at ${input.startsAt.toISOString()} (${meetingType.name}) is no longer available.`,
      null
    );
    return { ok: false, error: "That time is no longer available. Please pick another." };
  }

  const endsAt = addMinutes(input.startsAt, meetingType.durationMinutes);
  const bufferedStartsAt = addMinutes(input.startsAt, -meetingType.bufferBeforeMinutes);
  const bufferedEndsAt = addMinutes(endsAt, meetingType.bufferAfterMinutes);
  const manageToken = generateToken();

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        // Re-check overlap inside the transaction — closes the race
        // window between the read above and this write. Combined with
        // Serializable isolation, if two requests for overlapping slots
        // commit concurrently, Postgres aborts one and it's retried below
        // as a conflict, not a double-booking.
        const conflict = await tx.booking.findFirst({
          where: {
            status: { notIn: NON_BLOCKING_STATUSES },
            bufferedStartsAt: { lt: bufferedEndsAt },
            bufferedEndsAt: { gt: bufferedStartsAt },
          },
          select: { id: true },
        });
        if (conflict) throw new BookingConflictError();

        const contact = await findOrCreateContact(tx, email, name);
        const company = input.companyName ? await findOrCreateCompany(tx, input.companyName, contact.id) : null;
        const deal = await findOrConnectDeal(tx, {
          contactId: contact.id,
          companyId: company?.id ?? null,
          ownerId: owner.id,
          meetingType,
          meetingDate: input.startsAt,
          contactName: contactDisplayName(contact),
        });

        const created = await tx.booking.create({
          data: {
            meetingTypeId: meetingType.id,
            startsAt: input.startsAt,
            endsAt,
            bufferedStartsAt,
            bufferedEndsAt,
            name,
            email,
            companyName: input.companyName?.trim() || null,
            notes: input.notes?.trim() || null,
            timezone: input.timezone || owner.bookingTimezone,
            intakeAnswers: input.intakeAnswers ?? Prisma.JsonNull,
            idempotencyKey: input.idempotencyKey || null,
            manageToken,
            contactId: contact.id,
            companyId: company?.id ?? null,
            dealId: deal.id,
          },
        });

        await tx.activity.create({
          data: {
            type: "MEETING",
            summary: `Booked ${meetingType.name} for ${created.startsAt.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: owner.bookingTimezone,
            })}`,
            contactId: contact.id,
            dealId: deal.id,
            createdById: owner.id,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await notifyBookingCreated(booking, meetingType, owner, manageToken);
    await fireAutomationTrigger("APPOINTMENT_BOOKED", {
      contactId: booking.contactId ?? undefined,
      summary: `${name} booked ${meetingType.name} for ${booking.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
      variables: {
        date: booking.startsAt.toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: input.timezone || owner.bookingTimezone,
        }),
        meetingType: meetingType.name,
      },
    });

    return { ok: true, booking, manageToken, meetingType };
  } catch (err) {
    if (isConflictError(err)) {
      await logBooking(
        "BOOKING_CONFLICT",
        `${email} lost a race for ${input.startsAt.toISOString()} (${meetingType.name}) — slot was taken concurrently.`,
        null
      );
      return { ok: false, error: "That time was just booked by someone else. Please pick another." };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------
// Lookup by manage token
// ---------------------------------------------------------------------

export async function findBookingByManageToken(rawToken: string) {
  if (!rawToken) return null;
  return prisma.booking.findUnique({
    where: { manageToken: rawToken },
    include: { meetingType: true },
  });
}

// ---------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------

export type RescheduleResult =
  | { ok: true; booking: Booking; manageToken: string }
  | { ok: false; error: string };

export async function rescheduleBooking(rawManageToken: string, newStartsAt: Date): Promise<RescheduleResult> {
  const oldBooking = await findBookingByManageToken(rawManageToken);
  if (!oldBooking) return { ok: false, error: "Booking not found." };
  if (oldBooking.status !== "CONFIRMED") {
    return { ok: false, error: "This booking can no longer be rescheduled." };
  }
  const meetingType = oldBooking.meetingType;
  if (!meetingType) return { ok: false, error: "This booking's meeting type no longer exists." };
  if (!meetingType.allowRescheduling) {
    return { ok: false, error: "This meeting type doesn't support self-service rescheduling." };
  }

  const now = new Date();
  if (Number.isNaN(newStartsAt.getTime()) || newStartsAt.getTime() < now.getTime()) {
    return { ok: false, error: "That time is in the past. Please pick another." };
  }

  const owner = await prisma.user.findFirst();
  if (!owner) return { ok: false, error: "Booking isn't set up yet." };

  // Valid slots excluding the booking being replaced — its own slot must
  // not block itself from being re-picked coincidentally, and this list
  // is what "respects" everything (availability/buffers/notice/advance)
  // for the reschedule too.
  const slots = await getAvailableSlotsForType(meetingType, owner, now, oldBooking.id);
  if (!slots.some((s) => s.getTime() === newStartsAt.getTime())) {
    await logBooking("BOOKING_CONFLICT", `Reschedule of booking ${oldBooking.id} to ${newStartsAt.toISOString()} is not available.`, oldBooking.id);
    return { ok: false, error: "That time is no longer available. Please pick another." };
  }

  const endsAt = addMinutes(newStartsAt, meetingType.durationMinutes);
  const bufferedStartsAt = addMinutes(newStartsAt, -meetingType.bufferBeforeMinutes);
  const bufferedEndsAt = addMinutes(endsAt, meetingType.bufferAfterMinutes);
  const manageToken = generateToken();

  try {
    const newBooking = await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: oldBooking.id },
            status: { notIn: NON_BLOCKING_STATUSES },
            bufferedStartsAt: { lt: bufferedEndsAt },
            bufferedEndsAt: { gt: bufferedStartsAt },
          },
          select: { id: true },
        });
        if (conflict) throw new BookingConflictError();

        // The new booking is created — and must fully succeed — BEFORE the
        // old one is touched at all. If anything above or below this
        // throws, the transaction rolls back and the old booking is left
        // exactly as it was, still CONFIRMED and still holding its slot.
        // This is what "do not restore a slot after rescheduling until the
        // new booking succeeds" means in practice.
        const created = await tx.booking.create({
          data: {
            meetingTypeId: meetingType.id,
            startsAt: newStartsAt,
            endsAt,
            bufferedStartsAt,
            bufferedEndsAt,
            name: oldBooking.name,
            email: oldBooking.email,
            companyName: oldBooking.companyName,
            notes: oldBooking.notes,
            timezone: oldBooking.timezone,
            intakeAnswers: oldBooking.intakeAnswers ?? Prisma.JsonNull,
            manageToken,
            contactId: oldBooking.contactId,
            companyId: oldBooking.companyId,
            dealId: oldBooking.dealId,
            rescheduledFromId: oldBooking.id,
          },
        });

        // Only now — after the new row exists — is the old slot released.
        await tx.booking.update({ where: { id: oldBooking.id }, data: { status: "RESCHEDULED" } });

        if (oldBooking.dealId) {
          await tx.deal.update({ where: { id: oldBooking.dealId }, data: { meetingDate: newStartsAt } });
        }

        if (oldBooking.contactId) {
          await tx.activity.create({
            data: {
              type: "MEETING",
              summary: `Rescheduled ${meetingType.name} to ${created.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: owner.bookingTimezone })}`,
              contactId: oldBooking.contactId,
              dealId: oldBooking.dealId,
              createdById: owner.id,
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await notifyBookingRescheduled(newBooking, oldBooking, meetingType, owner, manageToken);
    await fireAutomationTrigger("APPOINTMENT_RESCHEDULED", {
      contactId: newBooking.contactId ?? undefined,
      summary: `${newBooking.name} rescheduled ${meetingType.name} to ${newBooking.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    });

    return { ok: true, booking: newBooking, manageToken };
  } catch (err) {
    if (isConflictError(err)) {
      await logBooking("BOOKING_CONFLICT", `Reschedule race for booking ${oldBooking.id} at ${newStartsAt.toISOString()}.`, oldBooking.id);
      return { ok: false, error: "That time was just booked by someone else. Please pick another." };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------

export type CancelResult = { ok: true } | { ok: false; error: string };

export async function cancelBookingByToken(rawManageToken: string, reason?: string): Promise<CancelResult> {
  const booking = await findBookingByManageToken(rawManageToken);
  if (!booking) return { ok: false, error: "Booking not found." };
  return cancelBooking(booking, reason, { enforcePolicy: true });
}

export async function cancelBookingAsOwner(bookingId: string, reason?: string): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { meetingType: true } });
  if (!booking) return { ok: false, error: "Booking not found." };
  return cancelBooking(booking, reason, { enforcePolicy: false });
}

async function cancelBooking(
  booking: Booking & { meetingType: MeetingType | null },
  reason: string | undefined,
  { enforcePolicy }: { enforcePolicy: boolean }
): Promise<CancelResult> {
  if (booking.status !== "CONFIRMED") {
    return { ok: false, error: "This booking is already cancelled, completed, or rescheduled." };
  }

  if (enforcePolicy && booking.meetingType?.minCancelNoticeHours) {
    const hoursUntil = (booking.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntil < booking.meetingType.minCancelNoticeHours) {
      return {
        ok: false,
        error: `Cancellations require at least ${booking.meetingType.minCancelNoticeHours} hours' notice. Please contact us directly to cancel this booking.`,
      };
    }
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason?.trim() || null },
  });

  const owner = await prisma.user.findFirst();
  if (owner && booking.meetingType) {
    await notifyBookingCancelled(updated, booking.meetingType, owner);
  }

  await fireAutomationTrigger("APPOINTMENT_CANCELLED", {
    contactId: booking.contactId ?? undefined,
    summary: `${booking.name}'s ${booking.meetingType?.name ?? "meeting"} on ${booking.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} was cancelled.`,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// Completed / No-show (owner-triggered only — no visitor self-service)
// ---------------------------------------------------------------------

export async function markBookingCompleted(bookingId: string): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "Only a confirmed booking can be marked completed." };

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED", completedAt: new Date() } });
  await fireAutomationTrigger("APPOINTMENT_COMPLETED", {
    contactId: booking.contactId ?? undefined,
    summary: `${booking.name}'s meeting on ${booking.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} was completed.`,
  });
  return { ok: true };
}

export async function markBookingNoShow(bookingId: string): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "Only a confirmed booking can be marked as a no-show." };

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "NO_SHOW", noShowAt: new Date() } });
  await fireAutomationTrigger("APPOINTMENT_NO_SHOW", {
    contactId: booking.contactId ?? undefined,
    summary: `${booking.name} was a no-show for their meeting on ${booking.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`,
  });
  return { ok: true };
}
