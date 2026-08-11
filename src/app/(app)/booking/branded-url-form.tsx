"use client";

import { useActionState } from "react";
import { updateBrandedUrl, type BrandedUrlState } from "./actions";

const initialState: BrandedUrlState = {};

export function BrandedUrlForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState(updateBrandedUrl, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <input
          name="brandedUrl"
          placeholder="https://book.yourdomain.com"
          defaultValue={current ?? ""}
          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {state?.error && <p className="mt-1 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="mt-1 text-sm text-emerald-400">Saved.</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
