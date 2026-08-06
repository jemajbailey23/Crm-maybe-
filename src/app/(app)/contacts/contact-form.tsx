"use client";

import { useActionState } from "react";
import type { ContactFormState } from "./actions";

const initialState: ContactFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const DEFAULT_STAGES: { value: string; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "READY_TO_CONTACT", label: "Ready to Contact" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DISCOVERY_SCHEDULED", label: "Discovery Scheduled" },
  { value: "DISCOVERY_COMPLETED", label: "Discovery Completed" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "NURTURE", label: "Nurture" },
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-t border-zinc-800 pt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </h3>
  );
}

export function ContactForm({
  action,
  companies,
  stages = DEFAULT_STAGES,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: ContactFormState,
    formData: FormData
  ) => Promise<ContactFormState>;
  companies: { id: string; name: string }[];
  stages?: { value: string; label: string }[];
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    status?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    tags?: string | null;
    notes?: string | null;
    companyId?: string | null;
    businessName?: string | null;
    industry?: string | null;
    website?: string | null;
    googleBusinessProfile?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    address?: string | null;
    leadSource?: string | null;
    pipelineStage?: string | null;
    estimatedDealValue?: number | null;
    monthlyValue?: number | null;
    leadScore?: number | null;
    closingProbability?: number | null;
    priority?: string | null;
    nextFollowUpAt?: string | Date | null;
    currentProblems?: string | null;
    desiredOutcome?: string | null;
    competitors?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input
            name="firstName"
            required
            defaultValue={defaultValues?.firstName}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input
            name="lastName"
            required
            defaultValue={defaultValues?.lastName}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <select
          name="status"
          defaultValue={defaultValues?.status ?? "LEAD"}
          className={inputClass}
        >
          <option value="LEAD">Lead</option>
          <option value="CLIENT">Client</option>
        </select>
      </div>

      <SectionHeading>Business information</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business name</label>
          <input
            name="businessName"
            defaultValue={defaultValues?.businessName ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Industry</label>
          <input
            name="industry"
            defaultValue={defaultValues?.industry ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Address</label>
        <input
          name="address"
          defaultValue={defaultValues?.address ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Website</label>
        <input
          name="website"
          type="url"
          placeholder="https://"
          defaultValue={defaultValues?.website ?? ""}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Google Business Profile</label>
          <input
            name="googleBusinessProfile"
            placeholder="https://"
            defaultValue={defaultValues?.googleBusinessProfile ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Facebook</label>
          <input
            name="facebook"
            placeholder="https://"
            defaultValue={defaultValues?.facebook ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Instagram</label>
          <input
            name="instagram"
            placeholder="https://"
            defaultValue={defaultValues?.instagram ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Title / role</label>
          <input
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            className={inputClass}
          />
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

      <SectionHeading>Sales information</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Lead source</label>
          <input
            name="leadSource"
            placeholder="Referral, Google Ads, Instagram…"
            defaultValue={defaultValues?.leadSource ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Pipeline stage</label>
          <select
            name="pipelineStage"
            defaultValue={defaultValues?.pipelineStage ?? "NEW"}
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Estimated deal value (USD)</label>
          <input
            name="estimatedDealValue"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.estimatedDealValue ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Monthly value (USD)</label>
          <input
            name="monthlyValue"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.monthlyValue ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Lead score (1-100)</label>
          <input
            name="leadScore"
            type="number"
            min="1"
            max="100"
            step="1"
            defaultValue={defaultValues?.leadScore ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Closing probability (%)</label>
          <input
            name="closingProbability"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={defaultValues?.closingProbability ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            name="priority"
            defaultValue={defaultValues?.priority ?? "MEDIUM"}
            className={inputClass}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Next follow-up date</label>
        <input
          name="nextFollowUpAt"
          type="date"
          defaultValue={toDateInputValue(defaultValues?.nextFollowUpAt)}
          className={inputClass}
        />
      </div>

      <SectionHeading>Pain points</SectionHeading>
      <div>
        <label className={labelClass}>Current problems</label>
        <textarea
          name="currentProblems"
          rows={2}
          defaultValue={defaultValues?.currentProblems ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Desired outcome</label>
        <textarea
          name="desiredOutcome"
          rows={2}
          defaultValue={defaultValues?.desiredOutcome ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Competitors</label>
        <input
          name="competitors"
          defaultValue={defaultValues?.competitors ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Tags (comma separated)</label>
        <input
          name="tags"
          defaultValue={defaultValues?.tags ?? ""}
          placeholder="lead, vip"
          className={inputClass}
        />
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
