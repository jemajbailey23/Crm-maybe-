"use client";

import { useActionState, useState } from "react";
import { submitOnboardingForm, type OnboardingSubmitState } from "./actions";

const initialState: OnboardingSubmitState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

type Values = {
  website: string;
  address: string;
  googleBusinessProfile: string;
  facebook: string;
  instagram: string;
  domain: string;
  hostingProvider: string;
  analyticsAccount: string;
  googleSearchConsole: string;
};

export function OnboardingForm({
  token,
  defaultValues,
}: {
  token: string;
  defaultValues: Partial<Record<keyof Values, string | null>>;
}) {
  const action = submitOnboardingForm.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  // Controlled, rather than defaultValue-only: a server action's <form>
  // resets every field back to its very first render once the action
  // completes (same gotcha noted in automations/automation-form.tsx) —
  // for an admin form that's harmless since the values didn't change, but
  // here a client who just typed in a new domain would see it snap back
  // right as "Saved!" appears, which reads as data loss even though the
  // save succeeded. Controlled state doesn't have that problem.
  const [values, setValues] = useState<Values>({
    website: defaultValues.website ?? "",
    address: defaultValues.address ?? "",
    googleBusinessProfile: defaultValues.googleBusinessProfile ?? "",
    facebook: defaultValues.facebook ?? "",
    instagram: defaultValues.instagram ?? "",
    domain: defaultValues.domain ?? "",
    hostingProvider: defaultValues.hostingProvider ?? "",
    analyticsAccount: defaultValues.analyticsAccount ?? "",
    googleSearchConsole: defaultValues.googleSearchConsole ?? "",
  });

  function field(name: keyof Values) {
    return {
      name,
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
    };
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Business</h2>
        <div>
          <label className={labelClass}>Website</label>
          <input type="url" placeholder="https://" className={inputClass} {...field("website")} />
        </div>
        <div>
          <label className={labelClass}>Business address</label>
          <input className={inputClass} {...field("address")} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Google Business Profile</label>
            <input placeholder="https://" className={inputClass} {...field("googleBusinessProfile")} />
          </div>
          <div>
            <label className={labelClass}>Facebook</label>
            <input placeholder="https://" className={inputClass} {...field("facebook")} />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input placeholder="https://" className={inputClass} {...field("instagram")} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Website &amp; hosting</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Don&apos;t have these handy, or not sure? Leave them blank — we can follow up.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Domain</label>
            <input placeholder="yourbusiness.com" className={inputClass} {...field("domain")} />
          </div>
          <div>
            <label className={labelClass}>Hosting provider</label>
            <input placeholder="GoDaddy, Bluehost, Wix…" className={inputClass} {...field("hostingProvider")} />
          </div>
          <div>
            <label className={labelClass}>Analytics</label>
            <input placeholder="GA4 property / link" className={inputClass} {...field("analyticsAccount")} />
          </div>
          <div>
            <label className={labelClass}>Google Search Console</label>
            <input placeholder="Property / link" className={inputClass} {...field("googleSearchConsole")} />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-400" aria-live="polite">
          Saved — thank you! You can come back to this link anytime to update your answers.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Submit"}
      </button>
    </form>
  );
}
