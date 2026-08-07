"use client";

import { useState, useTransition } from "react";
import { updateTaskStatus } from "./actions";

const STATUSES: { value: string; label: string }[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVIEW", label: "Review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  // Adjust local state during render (React's documented escape hatch) when
  // the prop changes from outside, instead of syncing via a useEffect.
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setLocalStatus(status);
  }

  function handleChange(nextStatus: string) {
    const previous = localStatus;
    setLocalStatus(nextStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, nextStatus);
      if (result?.error) {
        setLocalStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <select
        value={localStatus}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 max-w-[12rem] text-[11px] leading-snug text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
