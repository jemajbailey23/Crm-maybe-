"use client";

import { useActionState } from "react";
import { updateBusinessProfile, type BusinessProfileFormState } from "./business-profile-actions";
import { CONTACT_METHOD_OPTIONS } from "@/lib/brand-assets";

const initialState: BusinessProfileFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function BusinessProfileForm({
  contactId,
  defaultValues,
}: {
  contactId: string;
  defaultValues: {
    legalBusinessName?: string | null;
    serviceAreas?: string | null;
    yearsInBusiness?: string | null;
    businessHours?: string | null;
    preferredContactMethod?: string | null;
  };
}) {
  const action = updateBusinessProfile.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Legal business name</label>
          <input
            name="legalBusinessName"
            placeholder="Acme Concrete LLC"
            defaultValue={defaultValues.legalBusinessName ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Years in business</label>
          <input
            name="yearsInBusiness"
            placeholder="5"
            defaultValue={defaultValues.yearsInBusiness ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Service areas</label>
          <input
            name="serviceAreas"
            placeholder="Dallas, Fort Worth, Plano"
            defaultValue={defaultValues.serviceAreas ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Business hours</label>
          <input
            name="businessHours"
            placeholder="Mon–Fri 8am–5pm"
            defaultValue={defaultValues.businessHours ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Preferred contact method</label>
          <select
            name="preferredContactMethod"
            defaultValue={defaultValues.preferredContactMethod ?? ""}
            className={inputClass}
          >
            <option value="">Select…</option>
            {CONTACT_METHOD_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
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
