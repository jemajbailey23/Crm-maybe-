"use client";

import { useActionState } from "react";
import type { ArticleFormState } from "./actions";
import { CATEGORIES } from "./categories";

const initialState: ArticleFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function ArticleForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: ArticleFormState,
    formData: FormData
  ) => Promise<ArticleFormState>;
  defaultValues?: {
    title?: string;
    category?: string;
    content?: string;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            name="title"
            required
            defaultValue={defaultValues?.title}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            name="category"
            defaultValue={defaultValues?.category ?? CATEGORIES[0].value}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Content</label>
        <textarea
          name="content"
          required
          rows={16}
          defaultValue={defaultValues?.content ?? ""}
          placeholder="Write the script, SOP, template, or answer here…"
          className={`${inputClass} font-mono text-[13px] leading-relaxed`}
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
