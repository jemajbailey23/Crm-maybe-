import { describe, it, expect } from "vitest";
import { generateAvailableSlots, rangesOverlap, type AvailabilityRule } from "@/lib/availability";

// Pure-function tests — no database. A Wednesday, arbitrarily chosen as a
// stable "now" so day-of-week arithmetic in these tests is deterministic.
const NOW = new Date("2026-06-10T12:00:00.000Z"); // Wednesday

const WEEKDAY_9_TO_5: AvailabilityRule[] = [
  { dayOfWeek: 1, start: "09:00", end: "17:00" },
  { dayOfWeek: 2, start: "09:00", end: "17:00" },
  { dayOfWeek: 3, start: "09:00", end: "17:00" },
  { dayOfWeek: 4, start: "09:00", end: "17:00" },
  { dayOfWeek: 5, start: "09:00", end: "17:00" },
];

describe("generateAvailableSlots", () => {
  it("only generates slots on enabled days (respects disabled days)", () => {
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: [],
      minNoticeHours: 0,
      maxAdvanceDays: 14,
      now: NOW,
    });
    const weekdays = new Set(slots.map((s) => s.getUTCDay()));
    expect(weekdays.has(0)).toBe(false); // Sunday
    expect(weekdays.has(6)).toBe(false); // Saturday
  });

  it("respects minimum notice — no slots before now + minNoticeHours", () => {
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: [],
      minNoticeHours: 24,
      maxAdvanceDays: 14,
      now: NOW,
    });
    const earliestAllowed = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    for (const slot of slots) {
      expect(slot.getTime()).toBeGreaterThanOrEqual(earliestAllowed.getTime());
    }
  });

  it("respects the maximum advance window — no slots beyond now + maxAdvanceDays", () => {
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: [],
      minNoticeHours: 0,
      maxAdvanceDays: 3,
      now: NOW,
    });
    const latestAllowed = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    for (const slot of slots) {
      expect(slot.getTime()).toBeLessThanOrEqual(latestAllowed.getTime());
    }
  });

  it("excludes a slot that overlaps an existing booking", () => {
    // Thursday 2026-06-11, 10:00-10:30 UTC already booked.
    const existing = [{ bufferedStartsAt: new Date("2026-06-11T10:00:00Z"), bufferedEndsAt: new Date("2026-06-11T10:30:00Z") }];
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: existing,
      minNoticeHours: 0,
      maxAdvanceDays: 14,
      now: NOW,
    });
    const collision = slots.some((s) => s.getTime() === new Date("2026-06-11T10:00:00Z").getTime());
    expect(collision).toBe(false);
  });

  it("respects buffers — a slot too close to an existing booking's buffer is excluded", () => {
    // Existing booking 10:00-10:30, already widened by its own 15-min
    // buffer-after to 10:45. A new 30-min-buffer-before request for
    // 10:30-11:00 would only clear a 15-min gap, not enough — excluded.
    const existing = [{ bufferedStartsAt: new Date("2026-06-11T10:00:00Z"), bufferedEndsAt: new Date("2026-06-11T10:45:00Z") }];
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: existing,
      bufferBeforeMinutes: 30,
      minNoticeHours: 0,
      maxAdvanceDays: 14,
      now: NOW,
    });
    const tooClose = slots.some((s) => s.getTime() === new Date("2026-06-11T10:45:00Z").getTime());
    expect(tooClose).toBe(false);
  });

  it("allows a slot exactly back-to-back with zero buffers", () => {
    const existing = [{ bufferedStartsAt: new Date("2026-06-11T10:00:00Z"), bufferedEndsAt: new Date("2026-06-11T10:30:00Z") }];
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: existing,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minNoticeHours: 0,
      maxAdvanceDays: 14,
      now: NOW,
    });
    const backToBack = slots.some((s) => s.getTime() === new Date("2026-06-11T10:30:00Z").getTime());
    expect(backToBack).toBe(true);
  });

  it("never returns a slot in the past relative to now", () => {
    const slots = generateAvailableSlots({
      rules: WEEKDAY_9_TO_5,
      slotMinutes: 30,
      timezone: "UTC",
      existingBookings: [],
      minNoticeHours: 0,
      maxAdvanceDays: 14,
      now: NOW,
    });
    for (const slot of slots) {
      expect(slot.getTime()).toBeGreaterThanOrEqual(NOW.getTime());
    }
  });
});

describe("rangesOverlap", () => {
  it("detects a genuine overlap", () => {
    expect(
      rangesOverlap(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T10:30:00Z"), new Date("2026-01-01T10:15:00Z"), new Date("2026-01-01T10:45:00Z"))
    ).toBe(true);
  });
  it("does not flag back-to-back ranges as overlapping (half-open)", () => {
    expect(
      rangesOverlap(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T10:30:00Z"), new Date("2026-01-01T10:30:00Z"), new Date("2026-01-01T11:00:00Z"))
    ).toBe(false);
  });
});
