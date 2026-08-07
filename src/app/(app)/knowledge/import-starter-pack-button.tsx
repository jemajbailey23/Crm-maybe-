"use client";

import { useState, useTransition } from "react";
import { importStarterPack } from "./import-starter-pack";

export function ImportStarterPackButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              "Import the 29 BVD starter-pack articles (Sales Scripts, SOPs, templates, etc.)? They'll be added as Drafts — nothing is published or given to the AI Assistant until you review and approve each one. Already-imported articles are skipped, so this is safe to click again."
            )
          )
            return;
          setMessage(null);
          startTransition(async () => {
            const result = await importStarterPack();
            if (result.error) {
              setMessage(`Error: ${result.error}`);
            } else {
              setMessage(
                `${result.created} article${result.created === 1 ? "" : "s"} added` +
                  (result.skipped > 0 ? `, ${result.skipped} already present` : "") +
                  "."
              );
            }
          });
        }}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? "Importing…" : "Import starter pack"}
      </button>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
