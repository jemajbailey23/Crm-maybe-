"use client";

import { useActionState } from "react";
import { changeEmail, type ChangeEmailState } from "./actions";

const initialState: ChangeEmailState = {};

export function ChangeEmailForm() {
  const [state, formAction, pending] = useActionState(
    changeEmail,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          New email
        </label>
        <input
          name="newEmail"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Confirm new email
        </label>
        <input
          name="confirmEmail"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Current password
        </label>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Required to confirm it&apos;s really you.
        </p>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" aria-live="polite">
          Email updated. Use your new email next time you log in.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update email"}
      </button>
    </form>
  );
}
