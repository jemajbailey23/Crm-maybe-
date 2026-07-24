import { addDays, addHours, addMinutes } from "date-fns";
import { fromZonedTime, format as formatInZone } from "date-fns-tz";

export type AvailabilityRule = { dayOfWeek: number; start: string; end: string };

// Bookings must be made at least this far in advance.
export const MIN_BOOKING_NOTICE_HOURS = 12;

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

export function generateAvailableSlots({
  rules,
  slotMinutes,
  timezone,
  existingBookings,
  daysAhead = 14,
  now = new Date(),
}: {
  rules: AvailabilityRule[];
  slotMinutes: number;
  timezone: string;
  existingBookings: { startsAt: Date; endsAt: Date }[];
  daysAhead?: number;
  now?: Date;
}): Date[] {
  const slots: Date[] = [];
  const earliestStart = addHours(now, MIN_BOOKING_NOTICE_HOURS);

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
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
        if (slotStart.getTime() >= earliestStart.getTime()) {
          const overlaps = existingBookings.some(
            (b) => slotStart < b.endsAt && slotFinish > b.startsAt
          );
          if (!overlaps) slots.push(slotStart);
        }
        slotStart = slotFinish;
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
