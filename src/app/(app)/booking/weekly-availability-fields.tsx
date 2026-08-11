"use client";

import { useState } from "react";
import { WEEKDAY_LABELS, type AvailabilityRule } from "@/lib/availability";

export type DayRule = { enabled: boolean; start: string; end: string };

export function initDaysFromRules(rules: AvailabilityRule[]): DayRule[] {
  return Array.from({ length: 7 }, (_, day) => {
    const rule = rules.find((r) => r.dayOfWeek === day);
    return {
      enabled: Boolean(rule),
      start: rule?.start ?? "09:00",
      end: rule?.end ?? "17:00",
    };
  });
}

// Shared day/time-range editor — used both by the owner's default weekly
// availability (Booking settings) and by a meeting type's optional
// override (Meeting type form), so the two never drift into different
// UIs for the same underlying { dayOfWeek, start, end } shape.
export function WeeklyAvailabilityFields({
  namePrefix,
  days,
  onChange,
}: {
  namePrefix: string;
  days: DayRule[];
  onChange: (days: DayRule[]) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map((day, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <label className="flex w-24 shrink-0 items-center gap-2 text-zinc-300 sm:w-32">
            <input
              type="checkbox"
              name={`${namePrefix}enabled-${i}`}
              checked={day.enabled}
              onChange={(e) => onChange(days.map((d, idx) => (idx === i ? { ...d, enabled: e.target.checked } : d)))}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
            />
            {WEEKDAY_LABELS[i]}
          </label>
          <input
            type="time"
            name={`${namePrefix}start-${i}`}
            value={day.start}
            disabled={!day.enabled}
            onChange={(e) => onChange(days.map((d, idx) => (idx === i ? { ...d, start: e.target.value } : d)))}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
          />
          <span className="text-zinc-600">to</span>
          <input
            type="time"
            name={`${namePrefix}end-${i}`}
            value={day.end}
            disabled={!day.enabled}
            onChange={(e) => onChange(days.map((d, idx) => (idx === i ? { ...d, end: e.target.value } : d)))}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
          />
        </div>
      ))}
    </div>
  );
}

export function useWeeklyAvailability(initialRules: AvailabilityRule[]) {
  return useState<DayRule[]>(() => initDaysFromRules(initialRules));
}

// Parses the enabled-N/start-N/end-N fields written by
// WeeklyAvailabilityFields back into AvailabilityRule[] server-side.
export function parseWeeklyAvailability(formData: FormData, namePrefix: string): AvailabilityRule[] | { error: string } {
  const rules: AvailabilityRule[] = [];
  for (let day = 0; day < 7; day++) {
    const enabled = formData.get(`${namePrefix}enabled-${day}`) === "on";
    if (!enabled) continue;

    const start = String(formData.get(`${namePrefix}start-${day}`) ?? "");
    const end = String(formData.get(`${namePrefix}end-${day}`) ?? "");
    if (!start || !end) continue;
    if (start >= end) {
      return { error: `End time must be after start time for ${WEEKDAY_LABELS[day]}.` };
    }
    rules.push({ dayOfWeek: day, start, end });
  }
  return rules;
}
