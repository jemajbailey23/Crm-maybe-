"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "./actions";

const STATUSES: { value: string; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_ON_CLIENT", label: "Waiting on client" },
  { value: "WAITING_ON_APPROVAL", label: "Waiting on approval" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "QUALITY_REVIEW", label: "Quality review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateProjectStatus(projectId, next);
        });
      }}
      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
