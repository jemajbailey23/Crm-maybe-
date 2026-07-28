"use client";

import { useActionState, useState } from "react";
import { updateAvailability, type AvailabilityState } from "./actions";
import {
  WEEKDAY_LABELS,
  COMMON_TIMEZONES,
  type AvailabilityRule,
} from "@/lib/availability";

const initialState: AvailabilityState = {};

export function AvailabilityForm({
  rules,
  slotMinutes,
  timezone,
}: {
  rules: AvailabilityRule[];
  slotMinutes: number;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateAvailability,
    initialState
  );

  const [days, setDays] = useState(() =>
    Array.from({ length: 7 }, (_, day) => {
      const rule = rules.find((r) => r.dayOfWeek === day);
      return {
        enabled: Boolean(rule),
        start: rule?.start ?? "09:00",
        end: rule?.end ?? "17:00",
      };
    })
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        {days.map((day, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <label className="flex w-32 items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                name={`enabled-${i}`}
                checked={day.enabled}
                onChange={(e) =>
                  setDays((prev) =>
                    prev.map((d, idx) =>
                      idx === i ? { ...d, enabled: e.target.checked } : d
                    )
                  )
                }
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
              />
              {WEEKDAY_LABELS[i]}
            </label>
            <input
              type="time"
              name={`start-${i}`}
              value={day.start}
              disabled={!day.enabled}
              onChange={(e) =>
                setDays((prev) =>
                  prev.map((d, idx) =>
                    idx === i ? { ...d, start: e.target.value } : d
                  )
                )
              }
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
            />
            <span className="text-zinc-600">to</span>
            <input
              type="time"
              name={`end-${i}`}
              value={day.end}
              disabled={!day.enabled}
              onChange={(e) =>
                setDays((prev) =>
                  prev.map((d, idx) =>
                    idx === i ? { ...d, end: e.target.value } : d
                  )
                )
              }
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Call length
          </label>
          <select
            name="slotMinutes"
            defaultValue={slotMinutes}
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Your timezone
          </label>
          <select
            name="timezone"
            defaultValue={timezone}
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-400" aria-live="polite">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save availability"}
      </button>
    </form>
  );
}
