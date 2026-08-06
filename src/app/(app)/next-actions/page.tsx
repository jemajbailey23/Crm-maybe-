import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfDayInZone, endOfDayInZone } from "@/lib/timezone";
import { syncNextBestActions } from "./sync";
import { NextActionItemRow } from "./action-item";
import { byPriorityThenDue } from "./query";
import { EmptyState } from "@/components/ui/empty-state";
import type { NextBestActionItem } from "@prisma/client";

export const dynamic = "force-dynamic";

type ViewKey = "overdue" | "due-today" | "upcoming" | "snoozed" | "completed" | "dismissed";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "due-today", label: "Due today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "snoozed", label: "Snoozed" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
];

export default async function NextActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { view: rawView } = await searchParams;

  const now = new Date();
  await syncNextBestActions(now);

  const startOfToday = startOfDayInZone(now, user.bookingTimezone);
  const endOfToday = endOfDayInZone(now, user.bookingTimezone);

  const items = await prisma.nextBestActionItem.findMany();

  const buckets: Record<ViewKey, NextBestActionItem[]> = {
    overdue: [],
    "due-today": [],
    upcoming: [],
    snoozed: [],
    completed: [],
    dismissed: [],
  };

  for (const item of items) {
    if (item.status === "SNOOZED") {
      buckets.snoozed.push(item);
    } else if (item.status === "COMPLETED") {
      buckets.completed.push(item);
    } else if (item.status === "DISMISSED") {
      buckets.dismissed.push(item);
    } else if (item.dueDate && item.dueDate < startOfToday) {
      buckets.overdue.push(item);
    } else if (item.dueDate && item.dueDate <= endOfToday) {
      buckets["due-today"].push(item);
    } else {
      buckets.upcoming.push(item);
    }
  }

  buckets.overdue.sort(byPriorityThenDue);
  buckets["due-today"].sort(byPriorityThenDue);
  buckets.upcoming.sort(byPriorityThenDue);
  buckets.snoozed.sort((a, b) => (a.snoozedUntil?.getTime() ?? 0) - (b.snoozedUntil?.getTime() ?? 0));
  buckets.completed.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  buckets.dismissed.sort((a, b) => (b.dismissedAt?.getTime() ?? 0) - (a.dismissedAt?.getTime() ?? 0));

  const view: ViewKey = VIEWS.some((v) => v.key === rawView) ? (rawView as ViewKey) : "overdue";
  const activeItems = buckets[view];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Next actions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Deterministic recommendations generated from your real pipeline data — no next action, overdue
          follow-ups, stale deals, and more.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-3">
        {VIEWS.map((v) => {
          const count = buckets[v.key].length;
          const isActive = v.key === view;
          return (
            <Link
              key={v.key}
              href={`/next-actions?view=${v.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {v.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        {activeItems.length === 0 ? (
          <EmptyState message={emptyMessage(view)} />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {activeItems.map((item) => (
              <NextActionItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function emptyMessage(view: ViewKey) {
  switch (view) {
    case "overdue":
      return "Nothing overdue. Nice.";
    case "due-today":
      return "Nothing due today.";
    case "upcoming":
      return "No upcoming recommendations right now.";
    case "snoozed":
      return "Nothing snoozed.";
    case "completed":
      return "No completed recommendations yet.";
    case "dismissed":
      return "No dismissed recommendations.";
  }
}
