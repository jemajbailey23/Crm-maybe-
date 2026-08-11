"use client";

import { useActionState, useMemo, useState } from "react";
import { cancelBookingAction, rescheduleBookingAction, type ManageState, type RescheduleState } from "./actions";

const cancelInitial: ManageState = {};
const rescheduleInitial: RescheduleState = {};

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function CancelForm({ token, cancellationPolicy }: { token: string; cancellationPolicy: string | null }) {
  const action = cancelBookingAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, cancelInitial);
  const [confirming, setConfirming] = useState(false);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-100">Your booking has been cancelled.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Cancel this booking</h2>
      {cancellationPolicy && <p className="mt-1 text-xs text-zinc-500">{cancellationPolicy}</p>}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 text-sm text-red-400 transition-colors hover:text-red-300"
        >
          Cancel booking
        </button>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <textarea
            name="reason"
            rows={2}
            placeholder="Reason (optional)"
            className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {pending ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Never mind
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function RescheduleForm({ token, slots, slotMinutes }: { token: string; slots: string[]; slotMinutes: number }) {
  const action = rescheduleBookingAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, rescheduleInitial);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

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

  if (state?.success) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-100">Your booking has been rescheduled.</p>
        {state.newManageUrl && (
          <a href={state.newManageUrl} className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300">
            Manage your new time →
          </a>
        )}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Reschedule</h2>
        <p className="mt-1 text-sm text-zinc-500">No other times are available right now.</p>
      </div>
    );
  }

  const selectedDay = days[selectedDayIndex];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Reschedule</h2>
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
              i === selectedDayIndex ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(day[0])}
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
            {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(time)}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="startsAt" value={selectedSlot.toISOString()} />
          <p className="text-xs text-zinc-500">
            New time: {new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(selectedSlot)} · {slotMinutes} min
          </p>
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
          >
            {pending ? "Rescheduling…" : "Confirm new time"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ManagePanel({
  token,
  allowRescheduling,
  rescheduleSlots,
  slotMinutes,
  cancellationPolicy,
}: {
  token: string;
  allowRescheduling: boolean;
  rescheduleSlots: string[];
  slotMinutes: number;
  cancellationPolicy: string | null;
}) {
  return (
    <div className="space-y-4">
      {allowRescheduling && <RescheduleForm token={token} slots={rescheduleSlots} slotMinutes={slotMinutes} />}
      <CancelForm token={token} cancellationPolicy={cancellationPolicy} />
    </div>
  );
}
