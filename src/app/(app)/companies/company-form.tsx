"use client";

import { useActionState } from "react";
import type { CompanyFormState } from "./actions";

const initialState: CompanyFormState = {};

export function CompanyForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: CompanyFormState,
    formData: FormData
  ) => Promise<CompanyFormState>;
  defaultValues?: {
    name?: string;
    website?: string | null;
    phone?: string | null;
    notes?: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Company name
        </label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Website
          </label>
          <input
            name="website"
            defaultValue={defaultValues?.website ?? ""}
            placeholder="https://"
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
