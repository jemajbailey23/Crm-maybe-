import "server-only";
import { fromZonedTime, format as formatInZone } from "date-fns-tz";

export function startOfDayInZone(date: Date, timezone: string): Date {
  const dateStr = formatInZone(date, "yyyy-MM-dd", { timeZone: timezone });
  return fromZonedTime(`${dateStr}T00:00:00`, timezone);
}

export function endOfDayInZone(date: Date, timezone: string): Date {
  return new Date(startOfDayInZone(date, timezone).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function startOfMonthInZone(date: Date, timezone: string): Date {
  const monthStr = formatInZone(date, "yyyy-MM", { timeZone: timezone });
  return fromZonedTime(`${monthStr}-01T00:00:00`, timezone);
}

export function endOfMonthInZone(date: Date, timezone: string): Date {
  // Computed as "the millisecond before next month starts" using the same
  // string-based zoned arithmetic as the rest of this file, rather than
  // date-fns's addMonths (which reads calendar components in the Node
  // process's own local timezone, not the target one) — keeps this
  // correct regardless of what timezone the server happens to run in.
  const monthStr = formatInZone(date, "yyyy-MM", { timeZone: timezone });
  const [year, month] = monthStr.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  const nextMonthStart = fromZonedTime(`${nextMonthStr}-01T00:00:00`, timezone);
  return new Date(nextMonthStart.getTime() - 1);
}
