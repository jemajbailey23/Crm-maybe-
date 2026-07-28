"use client";

import { useState, useTransition } from "react";
import { updateProfitMargin } from "./actions";

export function ProfitMarginControl({ percent }: { percent: number }) {
  const [value, setValue] = useState(percent);
  const [isPending, startTransition] = useTransition();

  const commit = (next: number) => {
    startTransition(() => {
      updateProfitMargin(next);
    });
  };

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      Margin assumption
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={(e) => commit(Number(e.target.value))}
        className="w-14 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-center text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      />
      %
    </label>
  );
}
