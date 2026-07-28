"use client";

import { useActionState } from "react";
import type { TaskDetailFormState } from "./actions";

const initialState: TaskDetailFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const PRIORITIES: { value: string; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const RECURRENCES: { value: string; label: string }[] = [
  { value: "NONE", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function TaskForm({
  action,
  contacts,
  projects,
  defaultValues,
}: {
  action: (
    prevState: TaskDetailFormState,
    formData: FormData
  ) => Promise<TaskDetailFormState>;
  contacts: { id: string; firstName: string; lastName: string; businessName?: string | null }[];
  projects: { id: string; name: string }[];
  defaultValues: {
    title?: string;
    dueDate?: string | Date | null;
    notes?: string | null;
    labels?: string | null;
    priority?: string;
    recurrence?: string;
    progress?: number;
    contactId?: string | null;
    projectId?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Title</label>
        <input
          name="title"
          required
          defaultValue={defaultValues.title}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Due date</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues.dueDate)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            name="priority"
            defaultValue={defaultValues.priority ?? "MEDIUM"}
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
          <label className={labelClass}>Repeats</label>
          <select
            name="recurrence"
            defaultValue={defaultValues.recurrence ?? "NONE"}
            className={inputClass}
          >
            {RECURRENCES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Labels (comma separated)</label>
          <input
            name="labels"
            defaultValue={defaultValues.labels ?? ""}
            placeholder="urgent, client-facing"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Completion (%)</label>
        <input
          name="progress"
          type="number"
          min="0"
          max="100"
          step="5"
          defaultValue={defaultValues.progress ?? 0}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Linked client</label>
          <select
            name="contactId"
            defaultValue={defaultValues.contactId ?? ""}
            className={inputClass}
          >
            <option value="">No client</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.businessName || `${contact.firstName} ${contact.lastName}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Linked project</label>
          <select
            name="projectId"
            defaultValue={defaultValues.projectId ?? ""}
            className={inputClass}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
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
          defaultValue={defaultValues.notes ?? ""}
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
