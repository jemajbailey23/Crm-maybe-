"use client";

import { useState, useTransition } from "react";
import { updateStageThreshold } from "./actions";
import type { DealStage } from "@prisma/client";

export function StageThresholdInput({ stage, days }: { stage: DealStage; days: number }) {
  const [value, setValue] = useState(String(days));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={365}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next) || next < 1) {
            setError("Enter a whole number of days (1 or more).");
            setValue(String(days));
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await updateStageThreshold(stage, Math.round(next));
            if (result?.error) {
              setError(result.error);
              setValue(String(days));
            }
          });
        }}
        className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      />
      <span className="text-xs text-zinc-500">days</span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
