"use client";

import { useActionState, useRef } from "react";

type FormState = { error?: string };

export function SimpleListManager({
  items,
  addAction,
  deleteAction,
  placeholder,
  emptyText,
}: {
  items: { id: string; name: string }[];
  addAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (id: string) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [state, formAction, pending] = useActionState(addAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-3 flex gap-2"
      >
        <input
          name="name"
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {state?.error && <p className="mb-2 text-sm text-red-400">{state.error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-1.5 rounded-full bg-zinc-800 py-1 pl-3 pr-1.5 text-xs text-zinc-300"
            >
              {item.name}
              <button
                type="button"
                onClick={() => deleteAction(item.id)}
                className="rounded-full p-0.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-red-400"
                aria-label={`Remove ${item.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
