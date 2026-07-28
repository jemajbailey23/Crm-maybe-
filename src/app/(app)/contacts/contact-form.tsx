"use client";

import { useActionState } from "react";
import type { ContactFormState } from "./actions";

const initialState: ContactFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function ContactForm({
  action,
  companies,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: ContactFormState,
    formData: FormData
  ) => Promise<ContactFormState>;
  companies: { id: string; name: string }[];
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    tags?: string | null;
    notes?: string | null;
    companyId?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Title</label>
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
