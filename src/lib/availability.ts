import { addDays, addHours, addMinutes } from "date-fns";
import { fromZonedTime, format as formatInZone } from "date-fns-tz";

export type AvailabilityRule = { dayOfWeek: number; start: string; end: string };

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "UTC",
];

// A previously-booked range, widened by whatever buffers its own meeting
// type required — this IS the range nothing else may overlap, not the raw
// startsAt/endsAt (that widening already happened once at booking time and
// is stored on the row as bufferedStartsAt/bufferedEndsAt — see
// booking-engine.ts).
export type BufferedRange = { bufferedStartsAt: Date; bufferedEndsAt: Date };

/**
 * Generates open slots for one meeting type, in the owner's timezone.
 *
 * A candidate slot is available only when its OWN buffered range (its
 * start minus bufferBeforeMinutes, its end plus bufferAfterMinutes) does
 * not overlap any existing booking's already-buffered range. Checking both
 * sides' buffers this way is what makes buffers symmetric — a 15-minute
 * buffer-after on one meeting blocks a buffer-less meeting from starting
 * right after it, and vice versa.
 */
export function generateAvailableSlots({
  rules,
  slotMinutes,
  timezone,
  existingBookings,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
  minNoticeHours = 12,
  maxAdvanceDays = 30,
  now = new Date(),
}: {
  rules: AvailabilityRule[];
  slotMinutes: number;
  timezone: string;
  existingBookings: BufferedRange[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  now?: Date;
}): Date[] {
  const slots: Date[] = [];
  const earliestStart = addHours(now, minNoticeHours);
  const latestStart = addDays(now, maxAdvanceDays);

  for (let dayOffset = 0; dayOffset < maxAdvanceDays + 1; dayOffset++) {
    const candidate = addDays(now, dayOffset);
    const dateStr = formatInZone(candidate, "yyyy-MM-dd", { timeZone: timezone });
    const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();

    const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);
    for (const rule of dayRules) {
      if (!rule.start || !rule.end) continue;

      const rangeStart = fromZonedTime(`${dateStr}T${rule.start}:00`, timezone);
      const rangeEnd = fromZonedTime(`${dateStr}T${rule.end}:00`, timezone);

      let slotStart = rangeStart;
      while (addMinutes(slotStart, slotMinutes).getTime() <= rangeEnd.getTime()) {
        const slotFinish = addMinutes(slotStart, slotMinutes);
        const bufferedStart = addMinutes(slotStart, -bufferBeforeMinutes);
        const bufferedFinish = addMinutes(slotFinish, bufferAfterMinutes);

        if (
          slotStart.getTime() >= earliestStart.getTime() &&
          slotStart.getTime() <= latestStart.getTime()
        ) {
          const overlaps = existingBookings.some(
            (b) => bufferedStart < b.bufferedEndsAt && bufferedFinish > b.bufferedStartsAt
          );
          if (!overlaps) slots.push(slotStart);
        }
        slotStart = slotFinish;
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** True if [aStart, aEnd) overlaps [bStart, bEnd) — half-open ranges, so
 * back-to-back appointments (one ending exactly when the other starts)
 * don't count as overlapping. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}
