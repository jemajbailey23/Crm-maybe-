"use client";

import { useActionState, useState } from "react";
import type { AutomationFormState } from "./actions";
import { TRIGGERS, TRIGGER_LABEL, TRIGGER_DESCRIPTION, ACTION_TYPES, ACTION_LABEL } from "./meta";
import type { AutomationActionType, AutomationTrigger } from "@prisma/client";

const initialState: AutomationFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function AutomationForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: AutomationFormState,
    formData: FormData
  ) => Promise<AutomationFormState>;
  defaultValues?: {
    name?: string;
    trigger?: AutomationTrigger;
    actionType?: AutomationActionType;
    taskTitle?: string | null;
    taskDueInDays?: number | null;
    emailSubject?: string | null;
    emailBody?: string | null;
    webhookUrl?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    defaultValues?.trigger ?? "LEAD_CREATED"
  );
  const [actionType, setActionType] = useState<AutomationActionType>(
    defaultValues?.actionType ?? "CREATE_TASK"
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Name</label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Notify me when a lead comes in"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>When this happens…</label>
        <select
          name="trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
          className={inputClass}
        >
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {TRIGGER_LABEL[t]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">{TRIGGER_DESCRIPTION[trigger]}</p>
      </div>

      <div>
        <label className={labelClass}>Do this…</label>
        <select
          name="actionType"
          value={actionType}
          onChange={(e) => setActionType(e.target.value as AutomationActionType)}
          className={inputClass}
        >
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
      </div>

      {actionType === "CREATE_TASK" && (
        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div>
            <label className={labelClass}>Task title</label>
            <input
              name="taskTitle"
              defaultValue={defaultValues?.taskTitle ?? ""}
              placeholder="Leave blank to use the event's own description"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Due in (days)</label>
            <input
              name="taskDueInDays"
              type="number"
              min={0}
              step={1}
              defaultValue={defaultValues?.taskDueInDays ?? 1}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {actionType === "SEND_EMAIL" && (
        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Sent to your own account email.</p>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              name="emailSubject"
              defaultValue={defaultValues?.emailSubject ?? ""}
              placeholder={`Automation: ${defaultValues?.name ?? "..."}`}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              name="emailBody"
              rows={3}
              defaultValue={defaultValues?.emailBody ?? ""}
              placeholder="Optional extra message — the event details are appended automatically."
              className={inputClass}
            />
          </div>
        </div>
      )}

      {actionType === "WEBHOOK" && (
        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div>
            <label className={labelClass}>Webhook URL</label>
            <input
              name="webhookUrl"
              type="url"
              required
              defaultValue={defaultValues?.webhookUrl ?? ""}
              placeholder="https://hooks.zapier.com/..."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-500">
              A JSON payload is POSTed here — trigger, rule name, event summary, and
              linked contact ID — so you can wire this into Zapier, Make, n8n, or your
              own endpoint.
            </p>
          </div>
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
