"use client";

import { useState } from "react";
import type { AutomationTrigger } from "@prisma/client";
import { AutomationForm, type ActionDefaults } from "../automation-form";
import { createAutomationRule } from "../actions";
import { AUTOMATION_TEMPLATES } from "../templates";
import { TRIGGER_LABEL } from "../meta";

type Selection = {
  key: string;
  name?: string;
  trigger?: AutomationTrigger;
  actions?: ActionDefaults[];
};

export default function NewAutomationPage() {
  const [selection, setSelection] = useState<Selection | null>(null);

  if (!selection) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New automation</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Start from a template and tweak it, or build one from scratch.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AUTOMATION_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                setSelection({ key: t.key, name: t.name, trigger: t.trigger, actions: t.actions })
              }
              className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-colors hover:border-indigo-500/50 hover:bg-zinc-900"
            >
              <p className="font-medium text-zinc-100">{t.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{t.description}</p>
              <p className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-indigo-400/80">
                {TRIGGER_LABEL[t.trigger]}
              </p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelection({ key: "scratch" })}
            className="rounded-xl border border-dashed border-zinc-700 p-4 text-left transition-colors hover:border-indigo-500/50 hover:bg-zinc-900/50"
          >
            <p className="font-medium text-zinc-100">Start from scratch</p>
            <p className="mt-1 text-xs text-zinc-500">Pick your own trigger and actions.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">New automation</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Choose a trigger and what should happen automatically when it fires.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelection(null)}
          className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Templates
        </button>
      </div>
      <AutomationForm
        key={selection.key}
        action={createAutomationRule}
        submitLabel="Create automation"
        defaultValues={{ name: selection.name, trigger: selection.trigger, actions: selection.actions }}
      />
    </div>
  );
}
