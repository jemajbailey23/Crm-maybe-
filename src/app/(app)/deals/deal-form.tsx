"use client";

import { useActionState } from "react";
import type { DealFormState } from "./actions";

const initialState: DealFormState = {};

const DEFAULT_STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function DealForm({
  action,
  contacts,
  companies,
  stages = DEFAULT_STAGES,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: DealFormState,
    formData: FormData
  ) => Promise<DealFormState>;
  contacts: { id: string; firstName: string; lastName: string }[];
  companies: { id: string; name: string }[];
  stages?: { value: string; label: string }[];
  defaultValues?: {
    title?: string;
    value?: number | null;
    stage?: string;
    isRecurring?: boolean;
    notes?: string | null;
    contactId?: string | null;
    companyId?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Deal title</label>
        <input
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder="Website redesign — Acme Corp"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Value (USD)</label>
          <input
            name="value"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.value ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Stage</label>
          <select
            name="stage"
            defaultValue={defaultValues?.stage ?? "NEW"}
            className={inputClass}
          >
            {stages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="isRecurring"
          defaultChecked={defaultValues?.isRecurring}
          className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
        />
        Recurring revenue (retainer/subscription, not a one-time project)
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Contact</label>
          <select
            name="contactId"
            defaultValue={defaultValues?.contactId ?? ""}
            className={inputClass}
          >
            <option value="">No contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <select
            name="companyId"
            defaultValue={defaultValues?.companyId ?? ""}
            className={inputClass}
          >
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
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
