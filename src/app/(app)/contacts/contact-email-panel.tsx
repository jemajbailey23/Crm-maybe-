"use client";

import { useActionState } from "react";
import { sendContactEmail, type EmailFormState } from "./email-actions";

const initialState: EmailFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function ContactEmailPanel({ contactId, to }: { contactId: string; to: string }) {
  const action = sendContactEmail.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);

  // Uncontrolled (no value/onChange) is deliberate here — this is a
  // compose-then-clear flow, not an edit form, so React 19's native
  // behavior of resetting a <form action={...}> back to defaultValue
  // ("") once the action completes is exactly the wanted UX: hit send,
  // the draft clears. (Controlled state would be wrong here — see the
  // opposite gotcha noted on the onboarding form, an edit flow where
  // that same reset would look like data loss.)
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-zinc-400">Send email</h3>
        <span className="text-xs text-zinc-600">to {to}</span>
      </div>
      <div>
        <input name="subject" required placeholder="Subject" className={inputClass} />
      </div>
      <div>
        <textarea name="body" required rows={4} placeholder="Write your message…" className={inputClass} />
      </div>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-400">Sent.</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
