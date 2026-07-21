"use client";

import { useActionState } from "react";
import { createActivity, type ActivityFormState } from "./actions";

const initialState: ActivityFormState = {};

export function ActivityQuickForm({
  contactId,
  dealId,
}: {
  contactId?: string;
  dealId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createActivity,
    initialState
  );

  return (
    <form action={formAction} className="space-y-2">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      <div className="flex gap-2">
        <select
          name="type"
          defaultValue="NOTE"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="NOTE">Note</option>
          <option value="CALL">Call</option>
          <option value="EMAIL">Email</option>
          <option value="MEETING">Meeting</option>
        </select>
        <input
          name="summary"
          required
          placeholder="Left a voicemail about the proposal"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Logging…" : "Log"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
