"use client";

import { useState, useTransition } from "react";
import { importDefaultMeetingTypes } from "./import-defaults";

export function ImportDefaultsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await importDefaultMeetingTypes();
            setMessage(
              `${result.created} meeting type${result.created === 1 ? "" : "s"} added` +
                (result.skipped > 0 ? `, ${result.skipped} already present` : "") +
                "."
            );
          });
        }}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add the 5 standard meeting types"}
      </button>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
