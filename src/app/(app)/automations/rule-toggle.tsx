"use client";

import { useState, useTransition } from "react";
import { toggleAutomationRule } from "./actions";

export function RuleToggle({ ruleId, enabled }: { ruleId: string; enabled: boolean }) {
  const [value, setValue] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = !value;
        setValue(next);
        startTransition(() => {
          toggleAutomationRule(ruleId, next);
        });
      }}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        value
          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
          : "bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-zinc-700"
      }`}
    >
      {value ? "Enabled" : "Disabled"}
    </button>
  );
}
