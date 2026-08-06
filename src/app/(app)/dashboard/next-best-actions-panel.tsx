import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { NextActionItemRow } from "../next-actions/action-item";
import type { NextBestActionItem } from "@prisma/client";

export function NextBestActionsPanel({ items, totalActive }: { items: NextBestActionItem[]; totalActive: number }) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Next best actions</h2>
        <div className="flex items-center gap-3">
          {totalActive > 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
              {totalActive}
            </span>
          )}
          <Link href="/next-actions" className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300">
            View all →
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState
          message="Nothing needs your attention right now. Nice."
          actionLabel="Add a lead"
          actionHref="/contacts/new?status=LEAD"
        />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {items.map((item) => (
            <NextActionItemRow key={item.id} item={item} compact />
          ))}
        </ul>
      )}
    </div>
  );
}
