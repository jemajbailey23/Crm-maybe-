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
        <label className="block text-sm font-medium text-zinc-300">
          Name
        </label>
        <input
          name="name"
          required
          defaultValue={currentName}
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-400" aria-live="polite">
          Name updated.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update name"}
      </button>
    </form>
  );
}
