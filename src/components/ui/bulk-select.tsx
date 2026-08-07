"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";

type BulkSelectContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  clear: () => void;
};

const BulkSelectContext = createContext<BulkSelectContextValue | null>(null);

export function BulkSelectProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const value = useMemo<BulkSelectContextValue>(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleAll: (ids) =>
        setSelected((prev) => {
          const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
          return allSelected ? new Set() : new Set(ids);
        }),
      isSelected: (id) => selected.has(id),
      clear: () => setSelected(new Set()),
    }),
    [selected]
  );

  return <BulkSelectContext.Provider value={value}>{children}</BulkSelectContext.Provider>;
}

function useBulkSelect() {
  const ctx = useContext(BulkSelectContext);
  if (!ctx) throw new Error("useBulkSelect must be used within a BulkSelectProvider");
  return ctx;
}

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const { isSelected, toggle } = useBulkSelect();
  return (
    <input
      type="checkbox"
      checked={isSelected(id)}
      onChange={() => toggle(id)}
      aria-label={`Select ${label}`}
      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
    />
  );
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { selected, toggleAll } = useBulkSelect();
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={() => toggleAll(ids)}
      aria-label="Select all"
      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
    />
  );
}

export type BulkAction =
  | {
      type?: "action";
      label: string;
      onRun: (ids: string[]) => Promise<{ error?: string } | void>;
      confirmMessage?: string; // "{n}" is replaced with the selection count
      variant?: "default" | "danger";
    }
  | {
      type: "link";
      label: string;
      href: (ids: string[]) => string;
    };

// Renders as a plain link so the browser handles the file download itself —
// no client-side mutation, so it doesn't go through the async action path.
function ExportSelectedLink({ label, href, ids }: { label: string; href: (ids: string[]) => string; ids: string[] }) {
  return (
    <a
      href={href(ids)}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
    >
      {label}
    </a>
  );
}

// actions is built by a small per-page client component that imports its
// own server actions directly (Client Components may call Server Actions
// they import, but a Server Component page can't hand a plain closure
// across the boundary — so BulkActionBar is always used from inside one of
// those page-specific wrappers, never rendered with inline props from a
// Server Component).
export function BulkActionBar({
  itemLabel = "item",
  itemLabelPlural,
  actions,
}: {
  itemLabel?: string;
  // Only needed for irregular plurals (e.g. "company" -> "companies") —
  // naive "+s" is used otherwise.
  itemLabelPlural?: string;
  actions: BulkAction[];
}) {
  const { selected, clear } = useBulkSelect();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (selected.size === 0) return null;
  const ids = Array.from(selected);
  const plural = itemLabelPlural ?? `${itemLabel}s`;

  return (
    <div className="animate-slide-up sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-500/30 bg-zinc-950/95 px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm">
      <span className="font-medium text-indigo-300">
        {ids.length} {ids.length === 1 ? itemLabel : plural} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {error && <span className="text-xs text-red-400">{error}</span>}
        {actions.map((action) =>
          action.type === "link" ? (
            <ExportSelectedLink key={action.label} label={action.label} href={action.href} ids={ids} />
          ) : (
            <button
              key={action.label}
              type="button"
              disabled={isPending}
              onClick={() => {
                if (action.confirmMessage) {
                  const msg = action.confirmMessage.replace("{n}", String(ids.length));
                  if (!confirm(msg)) return;
                }
                setError(null);
                startTransition(async () => {
                  const result = await action.onRun(ids);
                  if (result?.error) {
                    setError(result.error);
                  } else {
                    clear();
                  }
                });
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                action.variant === "danger"
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {action.label}
            </button>
          )
        )}
        <button
          type="button"
          onClick={clear}
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
