import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { NextBestAction, NextBestActionSeverity } from "./next-best-actions";

const SEVERITY_VARIANT: Record<NextBestActionSeverity, "red" | "amber" | "blue"> = {
  urgent: "red",
  high: "amber",
  medium: "blue",
};

export function NextBestActionsPanel({ actions }: { actions: NextBestAction[] }) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Next best actions</h2>
        {actions.length > 0 && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
            {actions.length}
          </span>
        )}
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing needs your attention right now. Nice.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {actions.map((action) => (
            <li
              key={action.id}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <Link
                href={action.href}
                className="min-w-0 flex-1 truncate text-zinc-200 transition-colors hover:text-indigo-400"
              >
                {action.message}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-zinc-500">{action.category}</span>
                <Badge variant={SEVERITY_VARIANT[action.severity]}>
                  {action.severity}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
