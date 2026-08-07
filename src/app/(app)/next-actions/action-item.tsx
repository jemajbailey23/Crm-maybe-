"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { completeNextAction, dismissNextAction, snoozeNextAction, reopenNextAction } from "./actions";
import { createTaskFromNextAction } from "../tasks/actions";
import type { NBAPriority, NBAStatus } from "@prisma/client";

const PRIORITY_VARIANT: Record<NBAPriority, "red" | "amber" | "blue" | "default"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "blue",
  LOW: "default",
};

const PRIORITY_LABEL: Record<NBAPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function formatDate(date: Date | string | null) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

const SNOOZE_PRESETS: { label: string; days: number }[] = [
  { label: "Snooze 1 day", days: 1 },
  { label: "Snooze 3 days", days: 3 },
  { label: "Snooze 1 week", days: 7 },
];

export type NextActionItemData = {
  id: string;
  priority: NBAPriority;
  status: NBAStatus;
  reason: string;
  recommendedAction: string;
  dueDate: Date | string | null;
  href: string;
  snoozedUntil: Date | string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
};

export function NextActionItemRow({
  item,
  compact = false,
}: {
  item: NextActionItemData;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
      } else {
        // Optimistically hide — the underlying data will catch up on the
        // next revalidated render, this just avoids a flash of stale state.
        setHidden(true);
      }
    });
  }

  if (hidden) return null;

  const isActive = item.status === "ACTIVE" || item.status === "SNOOZED";

  return (
    <li className={`flex flex-col gap-2 py-3 ${compact ? "" : "sm:flex-row sm:items-start sm:justify-between"}`}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant={PRIORITY_VARIANT[item.priority]}>{PRIORITY_LABEL[item.priority]}</Badge>
          {item.dueDate && (
            <span className="text-xs text-zinc-500">Due {formatDate(item.dueDate)}</span>
          )}
          {item.status === "SNOOZED" && item.snoozedUntil && (
            <span className="text-xs text-zinc-500">· Snoozed until {formatDate(item.snoozedUntil)}</span>
          )}
        </div>
        <Link href={item.href} className="text-sm font-medium text-zinc-200 transition-colors hover:text-indigo-400">
          {item.reason}
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500">Recommended: {item.recommendedAction}</p>
        {error && (
          <p className="mt-1 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {isActive ? (
          <>
            <button
              type="button"
              disabled={isPending || taskCreated}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await createTaskFromNextAction({
                    title: item.recommendedAction,
                    dueDate: item.dueDate ? new Date(item.dueDate) : null,
                    contactId: item.contactId,
                    companyId: item.companyId,
                    dealId: item.dealId,
                  });
                  if (result?.error) setError(result.error);
                  else setTaskCreated(true);
                });
              }}
              className="rounded-lg border border-indigo-500/30 px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10 disabled:opacity-50"
            >
              {taskCreated ? "Task created ✓" : "Create task"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => completeNextAction(item.id))}
              className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Complete
            </button>
            <select
              disabled={isPending}
              defaultValue=""
              onChange={(e) => {
                const days = Number(e.target.value);
                if (!days) return;
                const until = addDays(new Date(), days).toISOString();
                run(() => snoozeNextAction(item.id, until));
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Snooze…</option>
              {SNOOZE_PRESETS.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => dismissNextAction(item.id))}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              Dismiss
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => reopenNextAction(item.id))}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Reopen
          </button>
        )}
      </div>
    </li>
  );
}
