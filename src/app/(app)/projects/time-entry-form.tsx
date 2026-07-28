"use client";

import { useActionState, useRef } from "react";
import { addTimeEntry, type TimeEntryFormState } from "./time-actions";

const initialState: TimeEntryFormState = {};

export function TimeEntryForm({ projectId }: { projectId: string }) {
  const action = addTimeEntry.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="w-24">
        <label className="block text-xs font-medium text-zinc-400">Hours</label>
        <input
          name="hours"
          type="number"
          min="0.25"
          step="0.25"
          required
          placeholder="1.5"
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex-1 min-w-[10rem]">
        <label className="block text-xs font-medium text-zinc-400">What did you work on?</label>
        <input
          name="description"
          placeholder="Homepage layout"
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Logging…" : "Log time"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
