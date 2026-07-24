"use client";

import { useActionState } from "react";
import { changeName, type ChangeNameState } from "./actions";

const initialState: ChangeNameState = {};

export function ChangeNameForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(
    changeName,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          name="name"
          required
          defaultValue={currentName}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" aria-live="polite">
          Name updated.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update name"}
      </button>
    </form>
  );
}
