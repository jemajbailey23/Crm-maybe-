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
