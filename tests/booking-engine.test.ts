import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Real-database integration tests, per this codebase's established
// convention (see Stage 6's finance tests) — only genuinely external side
// effects (outbound email, automation email/webhook sends) are mocked;
// everything that touches Postgres is real. There are real
// AutomationRule rows seeded in the dev DB from earlier feature work, so
// fireAutomationTrigger is mocked to keep this suite from sending real
// emails/webhooks — the mock's call arguments are still asserted against,
// which is what proves each lifecycle event actually fires its trigger.
const fireAutomationTrigger = vi.fn();
vi.mock("@/lib/automations", () => ({
  fireAutomationTrigger: (...args: unknown[]) => fireAutomationTrigger(...args),
}));

const mailSuccess = { current: true };
function maybeFail() {
  if (!mailSuccess.current) throw new Error("mail provider down");
}
const sendBookingConfirmationEmail = vi.fn(async (...args: unknown[]) => {
  void args;
  maybeFail();
});
const sendBookingOwnerNotification = vi.fn(async (...args: unknown[]) => {
  void args;
  maybeFail();
});
const sendBookingReminderEmail = vi.fn(async (...args: unknown[]) => {
  void args;
  maybeFail();
});
const sendBookingCancellationEmail = vi.fn(async (...args: unknown[]) => {
  void args;
  maybeFail();
});
vi.mock("@/lib/mail", () => ({
  sendBookingConfirmationEmail: (...args: unknown[]) => sendBookingConfirmationEmail(...args),
  sendBookingOwnerNotification: (...args: unknown[]) => sendBookingOwnerNotification(...args),
  sendBookingReminderEmail: (...args: unknown[]) => sendBookingReminderEmail(...args),
  sendBookingCancellationEmail: (...args: unknown[]) => sendBookingCancellationEmail(...args),
}));

const {
  createBooking,
  rescheduleBooking,
  cancelBookingByToken,
  cancelBookingAsOwner,
  markBookingCompleted,
  markBookingNoShow,
  getAvailableSlotsForType,
  findBookingByManageToken,
  resolveAvailabilityRules,
} = await import("@/lib/booking-engine");
const { notifyBookingCreated, sendDueBookingReminders } = await import("@/lib/booking-notify");

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const ALL_DAY_RULES = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, start: "00:00", end: "23:45" }));

const createdMeetingTypeIds: string[] = [];
const createdContactIds: string[] = [];
const createdBookingIds: string[] = [];
const createdCompanyIds: string[] = [];

async function makeMeetingType(overrides: Partial<Parameters<typeof prisma.meetingType.create>[0]["data"]> = {}) {
  const type = await prisma.meetingType.create({
    data: {
      name: `Test Type ${RUN_ID}-${createdMeetingTypeIds.length}`,
      slug: `test-type-${RUN_ID}-${createdMeetingTypeIds.length}`,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minNoticeHours: 0,
      maxAdvanceDays: 365,
      weeklyAvailability: ALL_DAY_RULES,
      allowRescheduling: true,
      isActive: true,
      ...overrides,
    },
  });
  createdMeetingTypeIds.push(type.id);
  return type;
}

let owner: Awaited<ReturnType<typeof prisma.user.findFirst>>;

beforeAll(async () => {
  owner = await prisma.user.findFirst();
  if (!owner) throw new Error("Expected a seeded User row in the dev DB for these tests to run against.");
});

beforeEach(() => {
  fireAutomationTrigger.mockClear();
  sendBookingConfirmationEmail.mockClear();
  sendBookingOwnerNotification.mockClear();
  sendBookingReminderEmail.mockClear();
  sendBookingCancellationEmail.mockClear();
  mailSuccess.current = true;
});

afterAll(async () => {
  // Booking.contactId/dealId/meetingTypeId are all onDelete: SetNull (by
  // design — a real booking's history should survive its contact being
  // deleted later), so deleting Contact/MeetingType rows does NOT clean up
  // Booking rows themselves; each has to be deleted explicitly, in this
  // order, or a still-CONFIRMED test booking is left behind occupying a
  // real calendar slot forever. BookingLog rows do cascade from Booking.
  await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
  await prisma.deal.deleteMany({ where: { contactId: { in: createdContactIds } } });
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
  await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
  await prisma.meetingType.deleteMany({ where: { id: { in: createdMeetingTypeIds } } });
});

function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

// Every real booking created across this file shares one global calendar
// (there's only one owner) — buffers can widen a booking's blocked range
// beyond its own start/end, so tests that just want an isolated, always-
// available slot use this counter-based allocator (6h apart) instead of
// picking arbitrary hour offsets by hand, which is what caused real
// cross-test collisions during development of this suite.
let slotCounter = 0;
function nextSlot(): Date {
  slotCounter += 1;
  return hoursFromNow(slotCounter * 6);
}

describe("createBooking — happy path", () => {
  it("creates a contact, deal, booking, and activity, and sends confirmation once", async () => {
    const meetingType = await makeMeetingType({ relatedDealStage: "DISCOVERY_SCHEDULED" });
    const email = `create-${RUN_ID}@example.com`;

    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Ada Lovelace",
      email,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-1`,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdContactIds.push(result.booking.contactId!);
    createdBookingIds.push(result.booking.id);

    expect(result.booking.status).toBe("CONFIRMED");
    expect(result.manageToken).toBeTruthy();

    const contact = await prisma.contact.findUnique({ where: { id: result.booking.contactId! } });
    expect(contact?.email).toBe(email);

    const deal = await prisma.deal.findUnique({ where: { id: result.booking.dealId! } });
    expect(deal?.stage).toBe("DISCOVERY_SCHEDULED");
    expect(deal?.meetingDate?.getTime()).toBe(result.booking.startsAt.getTime());

    const activity = await prisma.activity.findFirst({ where: { contactId: result.booking.contactId!, type: "MEETING" } });
    expect(activity).not.toBeNull();

    expect(fireAutomationTrigger).toHaveBeenCalledWith("APPOINTMENT_BOOKED", expect.objectContaining({ contactId: result.booking.contactId }));
    expect(sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(sendBookingOwnerNotification).toHaveBeenCalledTimes(1);

    const logs = await prisma.bookingLog.findMany({ where: { bookingId: result.booking.id } });
    expect(logs.some((l) => l.type === "CONFIRMATION_SENT")).toBe(true);
  });

  it("creates a company when one is provided", async () => {
    const meetingType = await makeMeetingType();
    const companyName = `Acme ${RUN_ID}`;

    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Grace Hopper",
      email: `company-${RUN_ID}@example.com`,
      companyName,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-2`,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdContactIds.push(result.booking.contactId!);
    createdBookingIds.push(result.booking.id);

    const company = await prisma.company.findFirst({ where: { name: companyName } });
    expect(company).not.toBeNull();
    createdCompanyIds.push(company!.id);
    expect(result.booking.companyId).toBe(company!.id);
  });

  it("never regresses a deal that's already further along than the related stage", async () => {
    const meetingType = await makeMeetingType({ relatedDealStage: "DISCOVERY_SCHEDULED" });
    const email = `noregress-${RUN_ID}@example.com`;

    const contact = await prisma.contact.create({ data: { firstName: "No", lastName: "Regress", email } });
    createdContactIds.push(contact.id);
    await prisma.deal.create({ data: { title: "Existing deal", stage: "NEGOTIATION", contactId: contact.id } });

    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "No Regress",
      email,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-3`,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdBookingIds.push(result.booking.id);
    const deal = await prisma.deal.findUnique({ where: { id: result.booking.dealId! } });
    expect(deal?.stage).toBe("NEGOTIATION");
  });
});

describe("createBooking — validation", () => {
  it("prevents booking in the past", async () => {
    const meetingType = await makeMeetingType();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: past,
      name: "Past Booker",
      email: `past-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-past`,
    });
    expect(result.ok).toBe(false);
  });

  it("respects minimum notice hours", async () => {
    const meetingType = await makeMeetingType({ minNoticeHours: 48 });
    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: hoursFromNow(1), // only 1 hour out, needs 48
      name: "Too Soon",
      email: `toosoon-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-notice`,
    });
    expect(result.ok).toBe(false);
  });

  it("respects the maximum advance booking window", async () => {
    const meetingType = await makeMeetingType({ maxAdvanceDays: 2 });
    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: hoursFromNow(24 * 30), // 30 days out, window is 2 days
      name: "Too Far",
      email: `toofar-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-advance`,
    });
    expect(result.ok).toBe(false);
  });

  it("requires answers to required intake questions", async () => {
    const meetingType = await makeMeetingType({
      intakeQuestions: [{ id: "q1", label: "What's your budget?", required: true }],
    });
    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "No Answer",
      email: `noanswer-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-intake`,
    });
    expect(result.ok).toBe(false);
  });
});

describe("createBooking — duplicate prevention and conflicts", () => {
  it("returns the original booking for a resubmitted idempotency key instead of creating a second one", async () => {
    const meetingType = await makeMeetingType();
    const key = `idem-${RUN_ID}-dup`;
    const input = {
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Dup Submitter",
      email: `dup-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: key,
    };

    const first = await createBooking(input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdContactIds.push(first.booking.contactId!);
    createdBookingIds.push(first.booking.id);

    const second = await createBooking(input);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.booking.id).toBe(first.booking.id);

    const allBookings = await prisma.booking.findMany({ where: { idempotencyKey: key } });
    expect(allBookings).toHaveLength(1);

    const dupLogs = await prisma.bookingLog.findMany({ where: { bookingId: first.booking.id, type: "DUPLICATE_PREVENTED" } });
    expect(dupLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("prevents two bookings from overlapping and logs the conflict", async () => {
    const meetingType = await makeMeetingType();
    const slot = nextSlot();

    const first = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: slot,
      name: "First Booker",
      email: `conflict-a-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-conflict-a`,
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      createdContactIds.push(first.booking.contactId!);
      createdBookingIds.push(first.booking.id);
    }

    const second = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: slot,
      name: "Second Booker",
      email: `conflict-b-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-conflict-b`,
    });
    expect(second.ok).toBe(false);

    const conflictLogs = await prisma.bookingLog.findMany({ where: { type: "BOOKING_CONFLICT", message: { contains: "conflict-b" } } });
    expect(conflictLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("respects buffers — a booking too close to another (even non-overlapping) is rejected", async () => {
    const meetingType = await makeMeetingType({ bufferBeforeMinutes: 15, bufferAfterMinutes: 15, durationMinutes: 30 });
    const first = nextSlot();

    const a = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: first,
      name: "Buffer A",
      email: `buffer-a-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-buffer-a`,
    });
    expect(a.ok).toBe(true);
    if (a.ok) {
      createdContactIds.push(a.booking.contactId!);
      createdBookingIds.push(a.booking.id);
    }

    // Starts exactly when A ends (30 min later) — but A's buffer-after (15
    // min) plus this one's buffer-before (15 min) means they're still too
    // close.
    const tooClose = new Date(first.getTime() + 30 * 60 * 1000);
    const b = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: tooClose,
      name: "Buffer B",
      email: `buffer-b-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-buffer-b`,
    });
    expect(b.ok).toBe(false);

    // An hour after A starts is clear of both buffers.
    const clear = new Date(first.getTime() + 60 * 60 * 1000);
    const c = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: clear,
      name: "Buffer C",
      email: `buffer-c-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-buffer-c`,
    });
    expect(c.ok).toBe(true);
    if (c.ok) {
      createdContactIds.push(c.booking.contactId!);
      createdBookingIds.push(c.booking.id);
    }
  });
});

describe("rescheduleBooking", () => {
  it("moves a booking to a new time, marks the old one RESCHEDULED, and links them", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Reschedule Me",
      email: `reschedule-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-resched-setup`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const newTime = nextSlot();
    const result = await rescheduleBooking(created.manageToken!, newTime);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    createdBookingIds.push(result.booking.id);
    expect(result.booking.startsAt.getTime()).toBe(newTime.getTime());
    expect(result.booking.rescheduledFromId).toBe(created.booking.id);

    const oldBooking = await prisma.booking.findUnique({ where: { id: created.booking.id } });
    expect(oldBooking?.status).toBe("RESCHEDULED");

    expect(fireAutomationTrigger).toHaveBeenCalledWith("APPOINTMENT_RESCHEDULED", expect.anything());
  });

  it("does NOT release the old slot when the reschedule target conflicts — old booking stays CONFIRMED", async () => {
    const meetingType = await makeMeetingType();

    const occupied = nextSlot();
    const blocker = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: occupied,
      name: "Blocker",
      email: `blocker-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-blocker`,
    });
    expect(blocker.ok).toBe(true);
    if (blocker.ok) {
      createdContactIds.push(blocker.booking.contactId!);
      createdBookingIds.push(blocker.booking.id);
    }

    const toReschedule = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Wants To Move",
      email: `wantsmove-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-wantsmove`,
    });
    expect(toReschedule.ok).toBe(true);
    if (!toReschedule.ok) return;
    createdContactIds.push(toReschedule.booking.contactId!);
    createdBookingIds.push(toReschedule.booking.id);

    // Try to reschedule into the already-occupied slot.
    const result = await rescheduleBooking(toReschedule.manageToken!, occupied);
    expect(result.ok).toBe(false);

    // The original booking must still be exactly as it was — CONFIRMED,
    // still holding its original slot. This is "do not restore a slot
    // after rescheduling until the new booking succeeds."
    const stillThere = await prisma.booking.findUnique({ where: { id: toReschedule.booking.id } });
    expect(stillThere?.status).toBe("CONFIRMED");
    expect(stillThere?.startsAt.getTime()).toBe(toReschedule.booking.startsAt.getTime());

    // And no orphaned "RESCHEDULED" or half-created row exists for it.
    const rescheduledCount = await prisma.booking.count({ where: { rescheduledFromId: toReschedule.booking.id } });
    expect(rescheduledCount).toBe(0);
  });
});

describe("cancelBookingByToken / cancelBookingAsOwner", () => {
  it("cancels a booking and restores its slot for others", async () => {
    const meetingType = await makeMeetingType();
    const slot = nextSlot();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: slot,
      name: "Cancel Me",
      email: `cancel-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-cancel`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const before = await getAvailableSlotsForType(meetingType, owner!, new Date());
    expect(before.some((s) => s.getTime() === slot.getTime())).toBe(false);

    const cancelResult = await cancelBookingByToken(created.manageToken!, "Change of plans");
    expect(cancelResult.ok).toBe(true);

    const cancelled = await prisma.booking.findUnique({ where: { id: created.booking.id } });
    expect(cancelled?.status).toBe("CANCELLED");
    expect(cancelled?.cancelReason).toBe("Change of plans");

    const after = await getAvailableSlotsForType(meetingType, owner!, new Date());
    expect(after.some((s) => s.getTime() === slot.getTime())).toBe(true);

    expect(fireAutomationTrigger).toHaveBeenCalledWith("APPOINTMENT_CANCELLED", expect.anything());
  });

  // Bugfix regression: Booking.startsAt used to be globally @unique, so a
  // cancelled booking's row (kept for history, not deleted) permanently
  // blocked its exact instant — getAvailableSlotsForType said it was free
  // (as the test above confirms), but the actual insert failed with a
  // DB-level unique violation the moment anyone tried to take it. Only a
  // real second createBooking() call into the exact same instant proves
  // this is fixed; checking the slot list alone (as above) doesn't.
  it("lets a different visitor actually re-book the exact instant a cancelled booking held", async () => {
    const meetingType = await makeMeetingType();
    const slot = nextSlot();

    const first = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: slot,
      name: "First Occupant",
      email: `reuse-a-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-reuse-a`,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdContactIds.push(first.booking.contactId!);
    createdBookingIds.push(first.booking.id);

    const cancelResult = await cancelBookingByToken(first.manageToken!);
    expect(cancelResult.ok).toBe(true);

    const second = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: slot,
      name: "Second Occupant",
      email: `reuse-b-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-reuse-b`,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    createdContactIds.push(second.booking.contactId!);
    createdBookingIds.push(second.booking.id);
    expect(second.booking.startsAt.getTime()).toBe(slot.getTime());
    expect(second.booking.status).toBe("CONFIRMED");
  });

  it("enforces the meeting type's minimum cancellation notice for self-service cancellation", async () => {
    const meetingType = await makeMeetingType({ minCancelNoticeHours: 48, minNoticeHours: 0 });
    const soon = hoursFromNow(2); // genuinely soon (real time) — under the 48h policy, off the 6h test grid
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: soon,
      name: "Late Canceller",
      email: `latecancel-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-latecancel`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const selfCancel = await cancelBookingByToken(created.manageToken!);
    expect(selfCancel.ok).toBe(false);

    // The owner can still cancel it directly, bypassing the visitor-facing policy.
    const ownerCancel = await cancelBookingAsOwner(created.booking.id);
    expect(ownerCancel.ok).toBe(true);
  });

  it("cannot cancel a booking twice", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Double Cancel",
      email: `doublecancel-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-doublecancel`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const first = await cancelBookingAsOwner(created.booking.id);
    expect(first.ok).toBe(true);
    const second = await cancelBookingAsOwner(created.booking.id);
    expect(second.ok).toBe(false);
  });
});

describe("markBookingCompleted / markBookingNoShow", () => {
  it("marks a booking completed and fires the automation trigger", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Completed Meeting",
      email: `completed-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-completed`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const result = await markBookingCompleted(created.booking.id);
    expect(result.ok).toBe(true);
    const updated = await prisma.booking.findUnique({ where: { id: created.booking.id } });
    expect(updated?.status).toBe("COMPLETED");
    expect(fireAutomationTrigger).toHaveBeenCalledWith("APPOINTMENT_COMPLETED", expect.anything());
  });

  it("marks a booking as a no-show and fires the automation trigger", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "No Show",
      email: `noshow-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-noshow`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const result = await markBookingNoShow(created.booking.id);
    expect(result.ok).toBe(true);
    const updated = await prisma.booking.findUnique({ where: { id: created.booking.id } });
    expect(updated?.status).toBe("NO_SHOW");
    expect(fireAutomationTrigger).toHaveBeenCalledWith("APPOINTMENT_NO_SHOW", expect.anything());
  });
});

describe("notifyBookingCreated — delivery failures are logged, not thrown", () => {
  it("logs DELIVERY_FAILED when the mail provider errors, without failing the booking", async () => {
    const meetingType = await makeMeetingType();
    mailSuccess.current = false;

    const result = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Mail Down",
      email: `maildown-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-maildown`,
    });

    // The booking itself must still succeed even though email delivery failed.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdContactIds.push(result.booking.contactId!);
    createdBookingIds.push(result.booking.id);

    const logs = await prisma.bookingLog.findMany({ where: { bookingId: result.booking.id, type: "DELIVERY_FAILED" } });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("does not send a second confirmation once confirmationSentAt is already set", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Once Only",
      email: `onceonly-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-onceonly`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);
    expect(sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: created.booking.id } });
    await notifyBookingCreated(booking, meetingType, owner!, created.manageToken!);

    // Still exactly once — the guard on confirmationSentAt prevented a resend.
    expect(sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
  });
});

describe("sendDueBookingReminders", () => {
  it("sends a due reminder once and records it, skipping it on a later sweep", async () => {
    const meetingType = await makeMeetingType({ reminderHoursBefore: [1] });
    // A normal, widely-spaced future slot — "due" is simulated by passing
    // a synthetic `now` exactly at the reminder offset, rather than
    // depending on real wall-clock proximity (which would risk collisions
    // with every other test's booking sharing this one calendar).
    const startsAt = nextSlot();
    const dueNow = new Date(startsAt.getTime() - 1 * 60 * 60 * 1000);
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt,
      name: "Reminder Test",
      email: `reminder-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-reminder`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    await sendDueBookingReminders(dueNow);
    expect(sendBookingReminderEmail).toHaveBeenCalledTimes(1);

    const afterFirstSweep = await prisma.booking.findUniqueOrThrow({ where: { id: created.booking.id } });
    expect(afterFirstSweep.remindersSent).toEqual([1]);

    // A second sweep at the same due time must not resend the same offset.
    await sendDueBookingReminders(dueNow);
    expect(sendBookingReminderEmail).toHaveBeenCalledTimes(1);

    const reminderLogs = await prisma.bookingLog.findMany({ where: { bookingId: created.booking.id, type: "REMINDER_SENT" } });
    expect(reminderLogs).toHaveLength(1);
  });

  it("does not mark a reminder sent if delivery fails, so it can retry", async () => {
    const meetingType = await makeMeetingType({ reminderHoursBefore: [1] });
    const startsAt = nextSlot();
    const dueNow = new Date(startsAt.getTime() - 1 * 60 * 60 * 1000);
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt,
      name: "Reminder Fail",
      email: `reminderfail-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-reminderfail`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    mailSuccess.current = false;
    await sendDueBookingReminders(dueNow);

    const afterFailedSweep = await prisma.booking.findUniqueOrThrow({ where: { id: created.booking.id } });
    expect(afterFailedSweep.remindersSent ?? []).toEqual([]);

    const failLogs = await prisma.bookingLog.findMany({ where: { bookingId: created.booking.id, type: "DELIVERY_FAILED" } });
    expect(failLogs.length).toBeGreaterThan(0);
  });
});

describe("findBookingByManageToken", () => {
  it("finds a booking by its manage token and returns null for an unknown one", async () => {
    const meetingType = await makeMeetingType();
    const created = await createBooking({
      meetingTypeSlug: meetingType.slug,
      startsAt: nextSlot(),
      name: "Findable",
      email: `findable-${RUN_ID}@example.com`,
      timezone: "UTC",
      idempotencyKey: `idem-${RUN_ID}-findable`,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdContactIds.push(created.booking.contactId!);
    createdBookingIds.push(created.booking.id);

    const found = await findBookingByManageToken(created.manageToken!);
    expect(found?.id).toBe(created.booking.id);

    const notFound = await findBookingByManageToken("not-a-real-token");
    expect(notFound).toBeNull();
  });
});

// Bugfix regression: resolveAvailabilityRules used to treat an explicit
// empty override ([], every day disabled) the same as "no override
// configured," silently falling back to the owner's default hours.
describe("resolveAvailabilityRules — empty override vs. no override", () => {
  it("uses the owner's default hours when no override is configured (null)", async () => {
    const meetingType = await makeMeetingType({ weeklyAvailability: Prisma.JsonNull });
    const rules = resolveAvailabilityRules(meetingType, owner!);
    expect(rules).toEqual(owner!.weeklyAvailability);
  });

  it("returns zero rules — not the owner's default — for a deliberately empty override", async () => {
    const meetingType = await makeMeetingType({ weeklyAvailability: [] });
    const rules = resolveAvailabilityRules(meetingType, owner!);
    expect(rules).toEqual([]);
  });

  it("an empty override produces zero bookable slots, not the owner's normal availability", async () => {
    const meetingType = await makeMeetingType({ weeklyAvailability: [] });
    const slots = await getAvailableSlotsForType(meetingType, owner!, new Date());
    expect(slots).toHaveLength(0);
  });
});
