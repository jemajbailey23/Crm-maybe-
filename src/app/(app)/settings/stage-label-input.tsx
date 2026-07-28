"use client";

import { useState, useTransition } from "react";
import { updateStageLabel } from "./actions";
import type { DealStage } from "@prisma/client";

export function StageLabelInput({ stage, label }: { stage: DealStage; label: string }) {
  const [value, setValue] = useState(label);
  const [isPending, startTransition] = useTransition();

  return (
    <input
      value={value}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next) {
          startTransition(() => {
            updateStageLabel(stage, next);
          });
        }
      }}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
    />
  );
}
