"use client";

import { useActionState, useState } from "react";
import type { ProjectFormState } from "./actions";

const initialState: ProjectFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const NAME_SUGGESTIONS = ["Website", "SEO", "AI Automation", "Google Business Profile", "CRM Setup", "Branding"];
const SERVICE_SUGGESTIONS = [
  "Local SEO",
  "Website Build",
  "Google Business Profile",
  "AI Receptionist",
  "CRM & Automation",
  "Monthly Reporting",
];

const STATUSES: { value: string; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_ON_CLIENT", label: "Waiting on client" },
  { value: "WAITING_ON_APPROVAL", label: "Waiting on approval" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "QUALITY_REVIEW", label: "Quality review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
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

export function ProjectForm({
  action,
  contacts,
  companies = [],
  owners = [],
  templates = [],
  isEditing = false,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  contacts: { id: string; firstName: string; lastName: string; businessName?: string | null }[];
  companies?: { id: string; name: string }[];
  owners?: { id: string; name: string }[];
  templates?: { id: string; name: string; description: string | null }[];
  // Template selection only applies at creation — applying a template
  // twice would duplicate its generated tasks, so editing an existing
  // project never shows the selector.
  isEditing?: boolean;
  defaultValues?: {
    name?: string;
    contactId?: string | null;
    companyId?: string | null;
    ownerId?: string | null;
    service?: string | null;
    status?: string | null;
    priority?: string | null;
    progress?: number | null;
    startDate?: string | Date | null;
    targetCompletionDate?: string | Date | null;
    actualCompletionDate?: string | Date | null;
    hoursBudgeted?: number | null;
    estimatedDeliveryCost?: number | null;
    estimatedProfitability?: number | null;
    blockedReason?: string | null;
    waitingReason?: string | null;
    internalNotes?: string | null;
    clientFacingNotes?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState(defaultValues?.status ?? "NOT_STARTED");

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Client</label>
          <select name="contactId" required defaultValue={defaultValues?.contactId ?? ""} className={inputClass}>
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
        <div>
          <label className={labelClass}>Client company</label>
          <select name="companyId" defaultValue={defaultValues?.companyId ?? ""} className={inputClass}>
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Project owner</label>
          <select name="ownerId" defaultValue={defaultValues?.ownerId ?? ""} className={inputClass}>
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Service</label>
          <input
            name="service"
            list="project-service-suggestions"
            defaultValue={defaultValues?.service ?? ""}
            placeholder="Local SEO"
            className={inputClass}
          />
          <datalist id="project-service-suggestions">
            {SERVICE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      {!isEditing && templates.length > 0 && (
        <div>
          <label className={labelClass}>Project template</label>
          <select name="templateId" defaultValue="" className={inputClass}>
            <option value="">No template — start blank</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Applying a template creates its default tasks (with due-date offsets and dependencies) and
            required approvals automatically.
          </p>
        </div>
      )}

      <SectionHeading>Status</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <select name="priority" defaultValue={defaultValues?.priority ?? "MEDIUM"} className={inputClass}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Completion %</label>
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
      </div>

      {status === "BLOCKED" && (
        <div>
          <label className={labelClass}>Blocked reason</label>
          <input
            name="blockedReason"
            defaultValue={defaultValues?.blockedReason ?? ""}
            placeholder="What's blocking this project?"
            className={inputClass}
          />
        </div>
      )}
      {(status === "WAITING_ON_CLIENT" || status === "WAITING_ON_APPROVAL") && (
        <div>
          <label className={labelClass}>Waiting reason</label>
          <input
            name="waitingReason"
            defaultValue={defaultValues?.waitingReason ?? ""}
            placeholder="What are you waiting on?"
            className={inputClass}
          />
        </div>
      )}

      <SectionHeading>Dates</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Start date</label>
          <input
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.startDate)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Target completion</label>
          <input
            name="targetCompletionDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.targetCompletionDate)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Actual completion</label>
          <input
            name="actualCompletionDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.actualCompletionDate)}
            className={inputClass}
          />
        </div>
      </div>

      <SectionHeading>Budget</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Hours budgeted</label>
          <input
            name="hoursBudgeted"
            type="number"
            min="0"
            step="0.5"
            defaultValue={defaultValues?.hoursBudgeted ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Est. delivery cost ($)</label>
          <input
            name="estimatedDeliveryCost"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.estimatedDeliveryCost ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Est. profitability ($)</label>
          <input
            name="estimatedProfitability"
            type="number"
            step="1"
            defaultValue={defaultValues?.estimatedProfitability ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">Manual estimate — not auto-calculated.</p>
        </div>
      </div>

      <SectionHeading>Notes</SectionHeading>
      <div>
        <label className={labelClass}>Internal notes</label>
        <textarea
          name="internalNotes"
          rows={3}
          defaultValue={defaultValues?.internalNotes ?? ""}
          placeholder="Never shown outside the CRM"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Client-facing notes</label>
        <textarea
          name="clientFacingNotes"
          rows={3}
          defaultValue={defaultValues?.clientFacingNotes ?? ""}
          placeholder="Written as if the client might see it"
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
        className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
