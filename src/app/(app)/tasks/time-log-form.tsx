"use client";

import { useState, useTransition } from "react";
import type { TaskActionResult } from "./actions";

export function TimeLogForm({ action }: { action: (minutes: number) => Promise<TaskActionResult> }) {
  const [minutes, setMinutes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300">Log time (minutes)</label>
      <div className="mt-1 flex items-end gap-2">
        <input
          type="number"
          min="1"
          step="5"
          value={minutes}
          disabled={isPending}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="30"
          className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={isPending || !minutes}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await action(Number(minutes));
              if (result?.error) {
                setError(result.error);
              } else {
                setMinutes("");
              }
            });
          }}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          Log
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
