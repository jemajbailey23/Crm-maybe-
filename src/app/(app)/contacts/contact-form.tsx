"use client";

import { useActionState } from "react";
import type { ContactFormState } from "./actions";

const initialState: ContactFormState = {};

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
          <label className="block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            name="firstName"
            required
            defaultValue={defaultValues?.firstName}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            name="lastName"
            required
            defaultValue={defaultValues?.lastName}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
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
          Tags (comma separated)
        </label>
        <input
          name="tags"
          defaultValue={defaultValues?.tags ?? ""}
          placeholder="lead, vip"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
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
