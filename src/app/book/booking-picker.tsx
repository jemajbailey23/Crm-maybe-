"use client";

import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingState } from "./actions";

const initialState: BookingState = {};

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function BookingPicker({
  slots,
  slotMinutes,
}: {
  slots: string[];
  slotMinutes: number;
}) {
  const days = useMemo(() => {
    const groups = new Map<string, Date[]>();
    for (const iso of slots) {
      const date = new Date(iso);
      const key = localDayKey(date);
      const existing = groups.get(key);
      if (existing) existing.push(date);
      else groups.set(key, [date]);
    }
    return Array.from(groups.values());
  }, [slots]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState
  );

  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500">
        No times are available right now — check back soon.
      </p>
    );
  }

  if (state?.success) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-900">
          You&apos;re booked!
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Check your email for confirmation.
        </p>
      </div>
    );
  }

  const selectedDay = days[selectedDayIndex];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedDayIndex(i);
                setSelectedSlot(null);
              }}
              className={`shrink-0 rounded-md px-3 py-2 text-xs font-medium ${
                i === selectedDayIndex
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(day[0])}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {selectedDay.map((time) => (
            <button
              key={time.toISOString()}
              type="button"
              onClick={() => setSelectedSlot(time)}
              className={`rounded-md border px-2 py-2 text-xs font-medium ${
                selectedSlot?.getTime() === time.getTime()
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }).format(time)}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <form
          action={formAction}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
        >
          <input type="hidden" name="startsAt" value={selectedSlot.toISOString()} />
          <p className="text-sm text-slate-600">
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(selectedSlot)}{" "}
            · {slotMinutes} min
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              What would you like to talk about? (optional)
            </label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600" aria-live="polite">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      )}
    </div>
  );
}
