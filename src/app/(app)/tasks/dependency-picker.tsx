"use client";

import { useState, useTransition } from "react";
import type { TaskActionResult } from "./actions";

export function DependencyPicker({
  action,
  tasks,
}: {
  action: (dependsOnTaskId: string) => Promise<TaskActionResult>;
  tasks: { id: string; title: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        >
          <option value="">Depends on…</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={isPending || !selected}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action(selected);
            if (result?.error) {
              setError(result.error);
            } else {
              setSelected("");
            }
          });
        }}
        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        Add
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  );
}
