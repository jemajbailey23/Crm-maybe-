"use client";

import { useActionState } from "react";
import type { ProjectFormState } from "./actions";

const initialState: ProjectFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const NAME_SUGGESTIONS = [
  "Website",
  "SEO",
  "AI Automation",
  "Google Business Profile",
  "CRM Setup",
  "Branding",
];

const STATUSES: { value: string; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ProjectForm({
  action,
  contacts,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>;
  contacts: { id: string; firstName: string; lastName: string; businessName?: string | null }[];
  defaultValues?: {
    name?: string;
    contactId?: string | null;
    status?: string | null;
    priority?: string | null;
    progress?: number | null;
    dueDate?: string | Date | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Project name</label>
        <input
          name="name"
          required
          list="project-name-suggestions"
          defaultValue={defaultValues?.name}
          placeholder="Website"
          className={inputClass}
        />
        <datalist id="project-name-suggestions">
          {NAME_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={labelClass}>Client</label>
        <select
          name="contactId"
          required
          defaultValue={defaultValues?.contactId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select a client…
          </option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.businessName || `${contact.firstName} ${contact.lastName}`}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "NOT_STARTED"}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            name="priority"
            defaultValue={defaultValues?.priority ?? "MEDIUM"}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Progress (%)</label>
          <input
            name="progress"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={defaultValues?.progress ?? 0}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Due date</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dueDate)}
            className={inputClass}
          />
        </div>
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
