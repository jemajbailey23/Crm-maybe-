"use client";

import { useActionState, useState } from "react";
import type { TaskDetailFormState } from "./actions";

const initialState: TaskDetailFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const PRIORITIES: { value: string; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVIEW", label: "Review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RECURRENCES: { value: string; label: string }[] = [
  { value: "NONE", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom interval" },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-t border-zinc-800 pt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </h3>
  );
}

export function TaskForm({
  action,
  contacts,
  companies = [],
  deals = [],
  projects,
  invoices = [],
  users = [],
  taskLabels = [],
  defaultValues,
  submitLabel = "Save changes",
}: {
  action: (
    prevState: TaskDetailFormState,
    formData: FormData
  ) => Promise<TaskDetailFormState>;
  contacts: { id: string; firstName: string; lastName: string; businessName?: string | null }[];
  companies?: { id: string; name: string }[];
  deals?: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  invoices?: { id: string; description: string; contact: { firstName: string; lastName: string } }[];
  users?: { id: string; name: string }[];
  taskLabels?: string[];
  defaultValues: {
    title?: string;
    description?: string | null;
    startDate?: string | Date | null;
    dueDate?: string | Date | null;
    status?: string;
    priority?: string;
    labels?: string | null;
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    dealId?: string | null;
    projectId?: string | null;
    invoiceId?: string | null;
    recurrence?: string;
    recurrenceIntervalDays?: number | null;
    estimatedMinutes?: number | null;
    waitingReason?: string | null;
    blockedReason?: string | null;
    completionNotes?: string | null;
    completionEvidenceUrl?: string | null;
    progress?: number;
  };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState(defaultValues.status ?? "READY");
  const [recurrence, setRecurrence] = useState(defaultValues.recurrence ?? "NONE");

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Title</label>
        <input name="title" required defaultValue={defaultValues.title} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
          <select name="priority" defaultValue={defaultValues.priority ?? "MEDIUM"} className={inputClass}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "WAITING" && (
        <div>
          <label className={labelClass}>Waiting reason</label>
          <input
            name="waitingReason"
            required
            defaultValue={defaultValues.waitingReason ?? ""}
            placeholder="Waiting on client to send logo files"
            className={inputClass}
          />
        </div>
      )}

      {status === "BLOCKED" && (
        <div>
          <label className={labelClass}>Blocked reason</label>
          <input
            name="blockedReason"
            required
            defaultValue={defaultValues.blockedReason ?? ""}
            placeholder="Blocked on hosting account access"
            className={inputClass}
          />
        </div>
      )}

      {status === "COMPLETED" && (
        <>
          <div>
            <label className={labelClass}>Completion notes</label>
            <textarea
              name="completionNotes"
              rows={2}
              defaultValue={defaultValues.completionNotes ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Completion evidence (link)</label>
            <input
              name="completionEvidenceUrl"
              type="url"
              defaultValue={defaultValues.completionEvidenceUrl ?? ""}
              placeholder="https://…"
              className={inputClass}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start date</label>
          <input
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues.startDate)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Due date</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues.dueDate)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Assigned owner</label>
        <select name="assignedToId" defaultValue={defaultValues.assignedToId ?? ""} className={inputClass}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <SectionHeading>Related records</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Contact</label>
          <select name="contactId" defaultValue={defaultValues.contactId ?? ""} className={inputClass}>
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName || `${c.firstName} ${c.lastName}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <select name="companyId" defaultValue={defaultValues.companyId ?? ""} className={inputClass}>
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Deal</label>
          <select name="dealId" defaultValue={defaultValues.dealId ?? ""} className={inputClass}>
            <option value="">No deal</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Project</label>
          <select name="projectId" defaultValue={defaultValues.projectId ?? ""} className={inputClass}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Invoice</label>
        <select name="invoiceId" defaultValue={defaultValues.invoiceId ?? ""} className={inputClass}>
          <option value="">No invoice</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.description} — {i.contact.firstName} {i.contact.lastName}
            </option>
          ))}
        </select>
      </div>

      <SectionHeading>Scheduling</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Repeats</label>
          <select
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className={inputClass}
          >
            {RECURRENCES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {recurrence === "CUSTOM" && (
          <div>
            <label className={labelClass}>Every N days</label>
            <input
              name="recurrenceIntervalDays"
              type="number"
              min="1"
              max="365"
              defaultValue={defaultValues.recurrenceIntervalDays ?? 14}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>Time estimate (minutes)</label>
          <input
            name="estimatedMinutes"
            type="number"
            min="0"
            step="5"
            defaultValue={defaultValues.estimatedMinutes ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Labels (comma separated)</label>
        <input
          name="labels"
          list="task-label-suggestions"
          defaultValue={defaultValues.labels ?? ""}
          placeholder="urgent, client-facing"
          className={inputClass}
        />
        <datalist id="task-label-suggestions">
          {taskLabels.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
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
