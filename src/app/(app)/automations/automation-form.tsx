"use client";

import { useActionState, useRef, useState } from "react";
import type { AutomationFormState } from "./actions";
import {
  TRIGGERS,
  TRIGGER_LABEL,
  TRIGGER_DESCRIPTION,
  ACTION_TYPES,
  ACTION_LABEL,
  EMAIL_RECIPIENTS,
  EMAIL_RECIPIENT_LABEL,
  AUTOMATION_TOKENS,
} from "./meta";
import type { AutomationActionType, AutomationEmailRecipient, AutomationTrigger } from "@prisma/client";

const initialState: AutomationFormState = {};
const MAX_ACTIONS = 5;

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export type ActionDefaults = {
  id?: string;
  actionType: AutomationActionType;
  taskTitle?: string | null;
  taskDueInDays?: number | null;
  emailRecipient?: AutomationEmailRecipient;
  emailSubject?: string | null;
  emailBody?: string | null;
  webhookUrl?: string | null;
  pushTitle?: string | null;
  pushBody?: string | null;
};

type ActionRow = ActionDefaults & { key: string };

function insertTokenInto(fieldId: string, token: string) {
  const el = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + token + el.value.slice(end);
  el.focus();
  const pos = start + token.length;
  el.setSelectionRange(pos, pos);
}

function TokenPicker({ fieldId }: { fieldId: string }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {AUTOMATION_TOKENS.map((t) => (
        <button
          key={t.token}
          type="button"
          title={t.description}
          onClick={() => insertTokenInto(fieldId, t.token)}
          className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
        >
          {t.token}
        </button>
      ))}
    </div>
  );
}

function ActionFields({
  index,
  action,
  onChange,
}: {
  index: number;
  action: ActionRow;
  onChange: (patch: Partial<ActionRow>) => void;
}) {
  const taskTitleId = `action-${index}-taskTitle-field`;
  const subjectId = `action-${index}-emailSubject-field`;
  const bodyId = `action-${index}-emailBody-field`;
  const pushTitleId = `action-${index}-pushTitle-field`;
  const pushBodyId = `action-${index}-pushBody-field`;

  return (
    <div>
      <input type="hidden" name={`action-${index}-id`} value={action.id ?? ""} />
      <div>
        <label className={labelClass}>Do this…</label>
        <select
          name={`action-${index}-actionType`}
          value={action.actionType}
          onChange={(e) => onChange({ actionType: e.target.value as AutomationActionType })}
          className={inputClass}
        >
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
      </div>

      {action.actionType === "CREATE_TASK" && (
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Task title</label>
            <input
              id={taskTitleId}
              name={`action-${index}-taskTitle`}
              defaultValue={action.taskTitle ?? ""}
              placeholder="Leave blank to use the event's own description"
              className={inputClass}
            />
            <TokenPicker fieldId={taskTitleId} />
          </div>
          <div>
            <label className={labelClass}>Due in (days)</label>
            <input
              name={`action-${index}-taskDueInDays`}
              type="number"
              min={0}
              step={1}
              defaultValue={action.taskDueInDays ?? 1}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {action.actionType === "SEND_EMAIL" && (
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Send to</label>
            <select
              name={`action-${index}-emailRecipient`}
              value={action.emailRecipient ?? "OWNER"}
              onChange={(e) => onChange({ emailRecipient: e.target.value as AutomationEmailRecipient })}
              className={inputClass}
            >
              {EMAIL_RECIPIENTS.map((r) => (
                <option key={r} value={r}>
                  {EMAIL_RECIPIENT_LABEL[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              {action.emailRecipient === "CONTACT"
                ? "Skipped (and logged as failed below) if this event has no linked contact, or the contact has no email on file."
                : "Sent to your own account email."}
            </p>
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              id={subjectId}
              name={`action-${index}-emailSubject`}
              required={action.emailRecipient === "CONTACT"}
              defaultValue={action.emailSubject ?? ""}
              placeholder={action.emailRecipient === "CONTACT" ? "Your call is confirmed" : "Automation: ..."}
              className={inputClass}
            />
            <TokenPicker fieldId={subjectId} />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              id={bodyId}
              name={`action-${index}-emailBody`}
              rows={3}
              required={action.emailRecipient === "CONTACT"}
              defaultValue={action.emailBody ?? ""}
              placeholder={
                action.emailRecipient === "CONTACT"
                  ? "Hi {{name}}, ..."
                  : "Optional extra message — the event's own description is appended automatically below this."
              }
              className={inputClass}
            />
            <TokenPicker fieldId={bodyId} />
            <p className="mt-1.5 text-xs text-zinc-500">
              {action.emailRecipient === "CONTACT"
                ? "This is the entire message the contact sees — write it as you would to them."
                : "The event's own description is appended automatically below this."}
            </p>
          </div>
        </div>
      )}

      {action.actionType === "WEBHOOK" && (
        <div className="mt-4">
          <label className={labelClass}>Webhook URL</label>
          <input
            name={`action-${index}-webhookUrl`}
            type="url"
            required
            defaultValue={action.webhookUrl ?? ""}
            placeholder="https://hooks.zapier.com/..."
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">
            A JSON payload is POSTed here — trigger, rule name, event summary, and linked contact ID
            — so you can wire this into Zapier, Make, n8n, or your own endpoint.
          </p>
        </div>
      )}

      {action.actionType === "PUSH_NOTIFICATION" && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-zinc-500">
            Sent to every device registered under Settings → Notifications. Set that up first if
            you haven&apos;t — there&apos;s nothing to send to otherwise.
          </p>
          <div>
            <label className={labelClass}>Title</label>
            <input
              id={pushTitleId}
              name={`action-${index}-pushTitle`}
              defaultValue={action.pushTitle ?? ""}
              placeholder="Leave blank to use this automation's name"
              className={inputClass}
            />
            <TokenPicker fieldId={pushTitleId} />
          </div>
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              id={pushBodyId}
              name={`action-${index}-pushBody`}
              rows={2}
              defaultValue={action.pushBody ?? ""}
              placeholder="New lead: {{name}}"
              className={inputClass}
            />
            <TokenPicker fieldId={pushBodyId} />
            <p className="mt-1.5 text-xs text-zinc-500">
              Leave blank to use the event&apos;s own description.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function newAction(key: string): ActionRow {
  return { key, actionType: "CREATE_TASK", emailRecipient: "OWNER" };
}

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
    actions?: ActionDefaults[];
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [trigger, setTrigger] = useState<AutomationTrigger>(defaultValues?.trigger ?? "LEAD_CREATED");
  // Only ever read/written from event handlers (addAction below), never
  // during render — the initial keys for existing actions are derived from
  // their array position instead, since that only needs to happen once at
  // mount time inside the useState initializer.
  const nextKey = useRef(0);

  const [actions, setActions] = useState<ActionRow[]>(() => {
    const initial = defaultValues?.actions?.length ? defaultValues.actions : [{ actionType: "CREATE_TASK" as const }];
    return initial.map((a, i) => ({ ...a, key: `init-${i}` }));
  });

  function updateAction(index: number, patch: Partial<ActionRow>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAction() {
    setActions((prev) => (prev.length >= MAX_ACTIONS ? prev : [...prev, newAction(`new-${nextKey.current++}`)]));
  }

  function removeAction(index: number) {
    setActions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="actionCount" value={actions.length} />

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

      <div className="space-y-3">
        <label className={labelClass}>Then do this…</label>
        {actions.map((a, i) => (
          <div key={a.key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Step {i + 1}
                {actions.length > 1 ? ` of ${actions.length}` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeAction(i)}
                disabled={actions.length <= 1}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Remove
              </button>
            </div>
            <ActionFields index={i} action={a} onChange={(patch) => updateAction(i, patch)} />
          </div>
        ))}
        <button
          type="button"
          onClick={addAction}
          disabled={actions.length >= MAX_ACTIONS}
          className="w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add another action
        </button>
        <p className="text-xs text-zinc-600">
          Every step above runs when the trigger fires — e.g. create a task <em>and</em> email the
          contact off one event, instead of building two separate automations.
        </p>
      </div>

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
