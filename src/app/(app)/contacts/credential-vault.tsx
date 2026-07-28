"use client";

import { useActionState, useRef, useState } from "react";
import {
  addCredential,
  deleteCredential,
  revealCredential,
  type CredentialFormState,
} from "./credentials-actions";

const initialState: CredentialFormState = {};

type CredentialItem = {
  id: string;
  label: string;
  username: string | null;
  url: string | null;
  notes: string | null;
};

function CredentialRow({ credential }: { credential: CredentialItem }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const secret = await revealCredential(credential.id);
      setRevealed(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      const secret = revealed ?? (await revealCredential(credential.id));
      await navigator.clipboard.writeText(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy.");
    }
  }

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-100">{credential.label}</p>
          {credential.username && (
            <p className="text-xs text-zinc-500">{credential.username}</p>
          )}
          {credential.url && (
            <a
              href={credential.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {credential.url}
            </a>
          )}
        </div>
        <form action={deleteCredential.bind(null, credential.id)}>
          <button
            type="submit"
            className="shrink-0 text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </form>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          {revealed ?? "••••••••••••"}
        </code>
        <button
          type="button"
          onClick={handleReveal}
          disabled={loading}
          className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50"
        >
          {loading ? "…" : revealed ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          Copy
        </button>
      </div>
      {credential.notes && <p className="mt-2 text-xs text-zinc-500">{credential.notes}</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </li>
  );
}

export function CredentialVault({
  contactId,
  credentials,
}: {
  contactId: string;
  credentials: CredentialItem[];
}) {
  const action = addCredential.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <p className="mb-4 text-xs text-zinc-500">
        Secrets are encrypted before they&apos;re stored and only decrypted when you
        reveal or copy them.
      </p>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            name="label"
            required
            placeholder="Label (e.g. Domain registrar)"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            name="username"
            placeholder="Username / email"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <input
          name="secret"
          type="password"
          required
          placeholder="Password / secret value"
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="url"
            type="url"
            placeholder="Login URL"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add credential"}
        </button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      </form>

      {credentials.length === 0 ? (
        <p className="text-sm text-zinc-500">No credentials stored yet.</p>
      ) : (
        <ul className="space-y-2">
          {credentials.map((credential) => (
            <CredentialRow key={credential.id} credential={credential} />
          ))}
        </ul>
      )}
    </div>
  );
}
