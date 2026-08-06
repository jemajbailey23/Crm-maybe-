"use client";

import { useActionState, useRef } from "react";
import { addLink, deleteLink, type LinkFormState } from "./links-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const initialState: LinkFormState = {};

type LinkItem = { id: string; label: string; url: string };

export function LinksPanel({
  contactId,
  links,
}: {
  contactId: string;
  links: LinkItem[];
}) {
  const action = addLink.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="w-40">
          <label className="block text-xs font-medium text-zinc-400">Label</label>
          <input
            name="label"
            required
            placeholder="Client portal"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-zinc-400">URL</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Add link
        </button>
      </form>
      {state?.error && <p className="mb-2 text-sm text-red-400">{state.error}</p>}

      {links.length === 0 ? (
        <p className="text-sm text-zinc-500">No links yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate font-medium text-zinc-200 hover:text-indigo-400"
              >
                {link.label}
              </a>
              <form action={deleteLink.bind(null, link.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Remove this link?"
                  className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                >
                  Remove
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
