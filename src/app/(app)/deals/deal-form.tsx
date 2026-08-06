"use client";

import { useActionState, useState } from "react";
import type { DealFormState } from "./actions";

const initialState: DealFormState = {};

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

const BILLING_METHODS: { value: string; label: string }[] = [
  { value: "ONE_TIME", label: "One-time invoice" },
  { value: "MONTHLY", label: "Monthly billing" },
];

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

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

export function DealForm({
  action,
  contacts,
  companies,
  users = [],
  serviceTypes = [],
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
  users?: { id: string; name: string }[];
  serviceTypes?: string[];
  stages?: { value: string; label: string }[];
  defaultValues?: {
    title?: string;
    stage?: string;
    contactId?: string | null;
    companyId?: string | null;
    assignedToId?: string | null;
    serviceInterest?: string | null;
    leadSource?: string | null;
    probability?: number | null;
    expectedCloseDate?: Date | string | null;
    oneTimeValue?: number | null;
    mrrValue?: number | null;
    nextAction?: string | null;
    nextActionDueAt?: Date | string | null;
    decisionMaker?: string | null;
    meetingDate?: Date | string | null;
    startDate?: Date | string | null;
    billingMethod?: string | null;
    proposalAccepted?: boolean;
    lostReason?: string | null;
    competitor?: string | null;
    notes?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [stage, setStage] = useState(defaultValues?.stage ?? "NEW_LEAD");

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Deal name</label>
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
          <label className={labelClass}>Company</label>
          <select name="companyId" defaultValue={defaultValues?.companyId ?? ""} className={inputClass}>
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Primary contact</label>
          <select name="contactId" defaultValue={defaultValues?.contactId ?? ""} className={inputClass}>
            <option value="">No contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Stage</label>
        <select
          name="stage"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className={inputClass}
        >
          {stages.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <SectionHeading>Deal details</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Service interest</label>
          <input
            name="serviceInterest"
            list="deal-service-suggestions"
            defaultValue={defaultValues?.serviceInterest ?? ""}
            placeholder="SEO retainer"
            className={inputClass}
          />
          <datalist id="deal-service-suggestions">
            {serviceTypes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Lead source</label>
          <input
            name="leadSource"
            defaultValue={defaultValues?.leadSource ?? ""}
            placeholder="Referral, Google Ads, Instagram…"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>One-time value (USD)</label>
          <input
            name="oneTimeValue"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.oneTimeValue ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Monthly recurring value (USD)</label>
          <input
            name="mrrValue"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.mrrValue ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Probability (%)</label>
          <input
            name="probability"
            type="number"
            min="0"
            max="100"
            step="5"
            defaultValue={defaultValues?.probability ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Expected close date</label>
          <input
            name="expectedCloseDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.expectedCloseDate)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Assigned owner</label>
        <select name="assignedToId" defaultValue={defaultValues?.assignedToId ?? ""} className={inputClass}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <SectionHeading>Follow-through</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Next action</label>
          <input
            name="nextAction"
            defaultValue={defaultValues?.nextAction ?? ""}
            placeholder="Send follow-up email"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Next action due</label>
          <input
            name="nextActionDueAt"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.nextActionDueAt)}
            className={inputClass}
          />
        </div>
      </div>

      {(stage === "DISCOVERY_SCHEDULED" ||
        stage === "DISCOVERY_COMPLETED" ||
        stage === "PROPOSAL_SENT" ||
        stage === "NEGOTIATION" ||
        stage === "WON") && (
        <>
          <SectionHeading>Discovery</SectionHeading>
          <p className="text-xs text-zinc-500">
            Required before Discovery Scheduled — a meeting date, or an existing booking with this contact.
          </p>
          <div>
            <label className={labelClass}>Meeting date</label>
            <input
              name="meetingDate"
              type="date"
              defaultValue={toDateInputValue(defaultValues?.meetingDate)}
              className={inputClass}
            />
          </div>
        </>
      )}

      {(stage === "PROPOSAL_SENT" || stage === "NEGOTIATION" || stage === "WON") && (
        <>
          <SectionHeading>Proposal</SectionHeading>
          <p className="text-xs text-zinc-500">
            Required before Proposal Sent — service interest and value above, plus the decision-maker below.
          </p>
          <div>
            <label className={labelClass}>Primary decision-maker</label>
            <input
              name="decisionMaker"
              defaultValue={defaultValues?.decisionMaker ?? ""}
              placeholder="Jane Doe, Owner"
              className={inputClass}
            />
          </div>
        </>
      )}

      {stage === "WON" && (
        <>
          <SectionHeading>Closing details</SectionHeading>
          <p className="text-xs text-zinc-500">
            Required before marking Won — service interest above, plus everything below.
          </p>
          <div className="grid grid-cols-2 gap-4">
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
              <label className={labelClass}>Billing method</label>
              <select
                name="billingMethod"
                defaultValue={defaultValues?.billingMethod ?? ""}
                className={inputClass}
              >
                <option value="">Choose one</option>
                {BILLING_METHODS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="proposalAccepted"
              defaultChecked={defaultValues?.proposalAccepted}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
            />
            Proposal accepted / confirmed by the client
          </label>
        </>
      )}

      {stage === "LOST" && (
        <>
          <SectionHeading>Lost details</SectionHeading>
          <div>
            <label className={labelClass}>Lost reason</label>
            <input
              name="lostReason"
              required
              defaultValue={defaultValues?.lostReason ?? ""}
              placeholder="Went with a competitor, budget cut, timing…"
              className={inputClass}
            />
          </div>
        </>
      )}

      <SectionHeading>Other</SectionHeading>
      <div>
        <label className={labelClass}>Competitor</label>
        <input
          name="competitor"
          defaultValue={defaultValues?.competitor ?? ""}
          placeholder="Who else are they considering?"
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
