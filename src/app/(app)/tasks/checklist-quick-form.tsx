"use client";

import { useActionState, useRef } from "react";
import type { TaskActionResult } from "./actions";

const initialState: TaskActionResult = {};

export function ChecklistQuickForm({
  action,
}: {
  action: (prevState: TaskActionResult, formData: FormData) => Promise<TaskActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex items-end gap-2"
    >
      <div className="flex-1">
        <input
          name="label"
          required
          placeholder="Add a checklist item"
          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        Add
      </button>
      {state?.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
