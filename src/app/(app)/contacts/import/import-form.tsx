"use client";

import { useActionState, useRef } from "react";
import { importContactsCsv, type ImportState } from "./actions";

const initialState: ImportState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importContactsCsv,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            CSV file
          </label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-600" aria-live="polite">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import contacts"}
        </button>
      </form>

      {state?.result && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-900">
            Imported {state.result.imported} contact
            {state.result.imported === 1 ? "" : "s"}
            {state.result.companiesCreated > 0 &&
              ` · created ${state.result.companiesCreated} new compan${
                state.result.companiesCreated === 1 ? "y" : "ies"
              }`}
          </p>
          {state.result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-slate-700">
                Skipped {state.result.skipped.length} row
                {state.result.skipped.length === 1 ? "" : "s"}:
              </p>
              <ul className="mt-1 list-inside list-disc text-slate-500">
                {state.result.skipped.map((s) => (
                  <li key={s.row}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
