"use client";

import { useActionState } from "react";
import { createActivity, type ActivityFormState } from "./actions";

const initialState: ActivityFormState = {};

export function ActivityQuickForm({
  contactId,
  dealId,
  projectId,
}: {
  contactId?: string;
  dealId?: string;
  projectId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createActivity,
    initialState
  );

  return (
    <form action={formAction} className="space-y-2">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <div className="flex gap-2">
        <select
          name="type"
          defaultValue="NOTE"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="NOTE">Note</option>
          <option value="CALL">Call</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="FACEBOOK_MESSAGE">Facebook message</option>
          <option value="MEETING">Meeting</option>
          <option value="DEMO">Demo</option>
          <option value="PROPOSAL">Proposal</option>
        </select>
        <input
          name="summary"
          required
          placeholder="Left a voicemail about the proposal"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          {pending ? "Logging…" : "Log"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
