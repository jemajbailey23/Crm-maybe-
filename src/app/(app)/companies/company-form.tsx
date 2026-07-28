"use client";

import { useActionState } from "react";
import type { CompanyFormState } from "./actions";

const initialState: CompanyFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

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
        <label className={labelClass}>Company name</label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Website</label>
          <input
            name="website"
            defaultValue={defaultValues?.website ?? ""}
            placeholder="https://"
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
