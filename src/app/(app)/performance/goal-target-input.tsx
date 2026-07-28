"use client";

import { useState, useTransition } from "react";
import { upsertGoal } from "./actions";
import type { GoalMetric, GoalPeriod } from "@prisma/client";

export function GoalTargetInput({
  metric,
  period,
  target,
  isCurrency = false,
}: {
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  isCurrency?: boolean;
}) {
  const [value, setValue] = useState(target);
  const [isPending, startTransition] = useTransition();

  const commit = (next: number) => {
    startTransition(() => {
      upsertGoal(metric, period, next);
    });
  };

  return (
    <label className="flex items-center gap-1 text-xs text-zinc-500">
      Goal
      {isCurrency && <span>$</span>}
      <input
        type="number"
        min={0}
        step={isCurrency ? 100 : 1}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={(e) => commit(Number(e.target.value))}
        className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-center text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      />
    </label>
  );
}
