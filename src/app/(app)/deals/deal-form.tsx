"use client";

import { useActionState } from "react";
import type { DealFormState } from "./actions";

const initialState: DealFormState = {};

const STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function DealForm({
  action,
  contacts,
  companies,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: DealFormState,
    formData: FormData
  ) => Promise<DealFormState>;
  contacts: { id: string; firstName: string; lastName: string }[];
  companies: { id: string; name: string }[];
  defaultValues?: {
    title?: string;
    value?: number | null;
    stage?: string;
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
        <label className="block text-sm font-medium text-slate-700">
          Deal title
        </label>
        <input
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder="Website redesign — Acme Corp"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Value (USD)
          </label>
          <input
            name="value"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.value ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Stage
          </label>
          <select
            name="stage"
            defaultValue={defaultValues?.stage ?? "NEW"}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Contact
          </label>
          <select
            name="contactId"
            defaultValue={defaultValues?.contactId ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
          <label className="block text-sm font-medium text-slate-700">
            Company
          </label>
          <select
            name="companyId"
            defaultValue={defaultValues?.companyId ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
        <label className="block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" aria-live="polite">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
