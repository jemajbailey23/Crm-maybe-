"use client";

import { useActionState } from "react";
import { createTask, type TaskFormState } from "./actions";

const initialState: TaskFormState = {};

export function TaskQuickForm({
  contactId,
  companyId,
  dealId,
  projectId,
  invoiceId,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  projectId?: string;
  invoiceId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createTask,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {invoiceId && <input type="hidden" name="invoiceId" value={invoiceId} />}
      <div className="flex-1 min-w-[10rem]">
        <label className="block text-xs font-medium text-zinc-400">
          New task
        </label>
        <input
          name="title"
          required
          placeholder="Follow up call"
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400">
          Due
        </label>
        <input
          name="dueDate"
          type="date"
          className="mt-1 block rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add task"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-400">{state.error}</p>
      )}
    </form>
  );
}
