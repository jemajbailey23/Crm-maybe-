"use client";

import { useState, useTransition } from "react";
import { runAutomationRuleNow, type TestRunState } from "./actions";
import { ACTION_LABEL } from "./meta";
import type { AutomationActionType } from "@prisma/client";

export function TestRunButton({ ruleId }: { ruleId: string }) {
  const [result, setResult] = useState<TestRunState | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            setResult(await runAutomationRuleNow(ruleId));
          });
        }}
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:opacity-50"
      >
        {isPending ? "Running…" : "Test this automation"}
      </button>
      <p className="mt-1.5 text-xs text-zinc-600">
        Runs every step now with sample data. Emails to a contact are redirected to you instead of a
        real client; tasks and webhooks are real (tasks are titled &ldquo;[Test]&rdquo;, webhook
        payloads are flagged <code className="font-mono">test: true</code>).
      </p>
      {result?.error && <p className="mt-2 text-sm text-red-400">{result.error}</p>}
      {result?.results && (
        <ul className="mt-2 space-y-1 text-sm">
          {result.results.map((r, i) => (
            <li key={i} className={r.ok ? "text-emerald-400" : "text-red-400"}>
              {r.ok ? "✓" : "✗"} {ACTION_LABEL[r.actionType as AutomationActionType]}
              {r.error ? ` — ${r.error}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
