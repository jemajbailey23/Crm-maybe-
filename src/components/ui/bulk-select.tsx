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

export type BulkModalField = {
  name: string;
  label: string;
  kind: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
};

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
    }
  | {
      // For actions that need more than a single click to confirm — e.g.
      // composing a message before sending. onRun's "info" is a
      // non-error result shown as a completion summary inside the modal
      // (e.g. "Sent to 8 of 10 — 2 had no email on file"), distinct from
      // "error" which keeps the form open for correction.
      type: "modal";
      label: string;
      modalTitle: string;
      description?: string;
      fields: BulkModalField[];
      submitLabel?: string;
      onRun: (ids: string[], values: Record<string, string>) => Promise<{ error?: string; info?: string }>;
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
  const [openModal, setOpenModal] = useState<(BulkAction & { type: "modal" }) | null>(null);

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
          ) : action.type === "modal" ? (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setError(null);
                setOpenModal(action);
              }}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              {action.label}
            </button>
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
      {openModal && (
        <BulkModal
          action={openModal}
          ids={ids}
          onClose={(didRun) => {
            setOpenModal(null);
            if (didRun) clear();
          }}
        />
      )}
    </div>
  );
}

// Two-phase: a form (subject/body-style fields) submits into onRun, then
// shows onRun's result as a completion summary in place of the form —
// rather than closing immediately — so a partial result (e.g. "8 sent, 2
// skipped") isn't lost the instant the bar clears the selection.
function BulkModal({
  action,
  ids,
  onClose,
}: {
  action: BulkAction & { type: "modal" };
  ids: string[];
  onClose: (didRun: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(action.fields.map((f) => [f.name, ""]))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-zinc-100">{action.modalTitle}</h3>
        {action.description && <p className="mt-1 text-xs text-zinc-500">{action.description}</p>}

        {done ? (
          <>
            <p className="mt-4 text-sm text-zinc-300">{done}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onClose(true)}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {action.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-zinc-400">{field.label}</label>
                  {field.kind === "textarea" ? (
                    <textarea
                      rows={5}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={values[field.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <input
                      required={field.required}
                      placeholder={field.placeholder}
                      value={values[field.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || action.fields.some((f) => f.required && !values[f.name].trim())}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await action.onRun(ids, values);
                    if (result?.error) setError(result.error);
                    else setDone(result?.info ?? "Done.");
                  });
                }}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
              >
                {pending ? "Sending…" : (action.submitLabel ?? "Submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
