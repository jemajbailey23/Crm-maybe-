"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import { createBooking, type BookingState } from "./actions";

const initialState: BookingState = {};

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function subscribeNoop() {
  return () => {};
}

// Slot times are formatted in the visitor's local timezone, which the
// server can't know — this returns false during SSR/first paint and true
// once hydrated on the client, without the hydration mismatch a plain
// useEffect+setState("mounted") would cause.
function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

// Generated once per page load and resubmitted unchanged on every attempt
// (including a retried/double-clicked submit) — the server treats a
// repeated key as "already done" instead of creating a second booking.
// crypto.randomUUID() only exists in a secure (client) context, which is
// exactly where this runs.
function useIdempotencyKey() {
  const [key] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`));
  return key;
}

type Question = { id: string; label: string; required: boolean };

export function BookingPicker({
  meetingTypeSlug,
  slots,
  slotMinutes,
  questions,
  cancellationPolicy,
}: {
  meetingTypeSlug: string;
  slots: string[];
  slotMinutes: number;
  questions: Question[];
  cancellationPolicy: string | null;
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
  const action = createBooking.bind(null, meetingTypeSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const idempotencyKey = useIdempotencyKey();

  const mounted = useIsClient();

  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        No times are available right now — check back soon.
      </p>
    );
  }

  if (state?.success) {
    return (
      <div className="animate-scale-in rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-100">
          You&apos;re booked!
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Check your email for confirmation.
        </p>
        {state.manageUrl && (
          <p className="mt-3 text-xs text-zinc-600">
            Need to make a change?{" "}
            <a href={state.manageUrl} className="text-indigo-400 hover:text-indigo-300">
              Manage your booking
            </a>
          </p>
        )}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 shrink-0 animate-pulse rounded-md bg-zinc-800/60" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-zinc-800/60" />
          ))}
        </div>
      </div>
    );
  }

  const selectedDay = days[selectedDayIndex];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedDayIndex(i);
                setSelectedSlot(null);
              }}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                i === selectedDayIndex
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
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
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                selectedSlot?.getTime() === time.getTime()
                  ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
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
          className="animate-slide-up space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <input type="hidden" name="startsAt" value={selectedSlot.toISOString()} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input
            type="hidden"
            name="visitorTimezone"
            value={Intl.DateTimeFormat().resolvedOptions().timeZone}
          />
          <p className="text-sm text-zinc-400">
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(selectedSlot)}{" "}
            · {slotMinutes} min
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              name="name"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Company <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              name="companyName"
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-zinc-300">
                {q.label} {!q.required && <span className="text-zinc-600">(optional)</span>}
              </label>
              <input
                name={`intake_${q.id}`}
                required={q.required}
                className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              What would you like to talk about? (optional)
            </label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {cancellationPolicy && (
            <p className="text-xs text-zinc-600">{cancellationPolicy}</p>
          )}
          {state?.error && (
            <p className="text-sm text-red-400" aria-live="polite">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
          >
            {pending ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      )}
    </div>
  );
}
