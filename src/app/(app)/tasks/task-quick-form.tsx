"use client";

import { useActionState } from "react";
import { createTask, type TaskFormState } from "./actions";

const initialState: TaskFormState = {};

export function TaskQuickForm({
  contactId,
  dealId,
}: {
  contactId?: string;
  dealId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createTask,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      <div className="flex-1 min-w-[10rem]">
        <label className="block text-xs font-medium text-slate-600">
          New task
        </label>
        <input
          name="title"
          required
          placeholder="Follow up call"
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Due
        </label>
        <input
          name="dueDate"
          type="date"
          className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add task"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
