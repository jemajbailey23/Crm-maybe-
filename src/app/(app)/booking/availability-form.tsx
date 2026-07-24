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
            <label className="flex w-32 items-center gap-2">
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
                className="rounded border-slate-300"
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
              className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
            />
            <span className="text-slate-400">to</span>
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
              className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Call length
          </label>
          <select
            name="slotMinutes"
            defaultValue={slotMinutes}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Your timezone
          </label>
          <select
            name="timezone"
            defaultValue={timezone}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
        <p className="text-sm text-red-600" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" aria-live="polite">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save availability"}
      </button>
    </form>
  );
}
