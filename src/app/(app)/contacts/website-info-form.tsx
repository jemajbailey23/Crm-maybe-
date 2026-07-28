"use client";

import { useActionState } from "react";
import { updateWebsiteInfo, type WebsiteInfoFormState } from "./website-actions";

const initialState: WebsiteInfoFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function WebsiteInfoForm({
  contactId,
  defaultValues,
}: {
  contactId: string;
  defaultValues: {
    domain?: string | null;
    hostingProvider?: string | null;
    analyticsAccount?: string | null;
    googleSearchConsole?: string | null;
  };
}) {
  const action = updateWebsiteInfo.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Domain</label>
          <input
            name="domain"
            placeholder="mariasbakery.com"
            defaultValue={defaultValues.domain ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Hosting provider</label>
          <input
            name="hostingProvider"
            placeholder="Vercel, Bluehost, WP Engine…"
            defaultValue={defaultValues.hostingProvider ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Analytics</label>
          <input
            name="analyticsAccount"
            placeholder="GA4 property / link"
            defaultValue={defaultValues.analyticsAccount ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Google Search Console</label>
          <input
            name="googleSearchConsole"
            placeholder="Property / link"
            defaultValue={defaultValues.googleSearchConsole ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
