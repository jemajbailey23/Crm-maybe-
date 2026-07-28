"use client";

import { useActionState } from "react";
import { changeEmail, type ChangeEmailState } from "./actions";

const initialState: ChangeEmailState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function ChangeEmailForm() {
  const [state, formAction, pending] = useActionState(
    changeEmail,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>New email</label>
        <input
          name="newEmail"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Confirm new email</label>
        <input
          name="confirmEmail"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Current password</label>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Required to confirm it&apos;s really you.
        </p>
      </div>
      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-400" aria-live="polite">
          Email updated. Use your new email next time you log in.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update email"}
      </button>
    </form>
  );
}
