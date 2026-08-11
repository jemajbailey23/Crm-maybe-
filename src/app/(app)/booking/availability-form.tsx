"use client";

import { useActionState } from "react";
import { updateAvailability, type AvailabilityState } from "./actions";
import { COMMON_TIMEZONES, type AvailabilityRule } from "@/lib/availability";
import { WeeklyAvailabilityFields, useWeeklyAvailability } from "./weekly-availability-fields";

const initialState: AvailabilityState = {};

export function AvailabilityForm({
  rules,
  timezone,
}: {
  rules: AvailabilityRule[];
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(updateAvailability, initialState);
  const [days, setDays] = useWeeklyAvailability(rules);

  return (
    <form action={formAction} className="space-y-6">
      <WeeklyAvailabilityFields namePrefix="" days={days} onChange={setDays} />

      <div>
        <label className="block text-sm font-medium text-zinc-300">
          Your timezone
        </label>
        <select
          name="timezone"
          defaultValue={timezone}
          className="mt-1 block w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-600">
          Each meeting type sets its own call length and can optionally override these hours.
        </p>
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
