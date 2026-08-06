"use client";

import { useActionState, useRef, useTransition } from "react";
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  type ChecklistFormState,
} from "./checklist-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const initialState: ChecklistFormState = {};

type ChecklistItem = { id: string; label: string; done: boolean };

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-2.5 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => toggleChecklistItem(item.id, item.done))
          }
          aria-label="Toggle checklist item"
          className={`h-4 w-4 shrink-0 rounded border transition-colors ${
            item.done
              ? "border-indigo-500 bg-indigo-500"
              : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
          }`}
        />
        <span
          className={`truncate ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}
        >
          {item.label}
        </span>
      </div>
      <form action={deleteChecklistItem.bind(null, item.id)}>
        <ConfirmSubmitButton
          confirmMessage="Remove this checklist item?"
          className="text-xs text-zinc-600 transition-colors hover:text-red-400"
        >
          Remove
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

export function ChecklistPanel({
  projectId,
  items,
}: {
  projectId: string;
  items: ChecklistItem[];
}) {
  const action = addChecklistItem.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const doneCount = items.filter((i) => i.done).length;

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
          name="label"
          required
          placeholder="Add a checklist item"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        <p className="text-sm text-zinc-500">No checklist items yet.</p>
      ) : (
        <>
          <p className="mb-1 text-xs text-zinc-500">
            {doneCount} of {items.length} complete
          </p>
          <ul className="divide-y divide-zinc-800/60">
            {items.map((item) => (
              <ChecklistRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
