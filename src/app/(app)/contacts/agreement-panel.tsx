"use client";

import { useActionState, useRef, useTransition } from "react";
import { uploadAgreement, setAgreementSigned, removeAgreement, type AgreementFormState } from "./agreement-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const initialState: AgreementFormState = {};

export function AgreementPanel({
  contactId,
  fileUrl,
  filename,
  uploadedAt,
  signed,
}: {
  contactId: string;
  fileUrl: string | null;
  filename: string | null;
  uploadedAt: Date | null;
  signed: boolean;
}) {
  const uploadWithId = uploadAgreement.bind(null, contactId);
  const [state, formAction, pending] = useActionState(uploadWithId, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [togglePending, startTransition] = useTransition();
  const removeWithId = removeAgreement.bind(null, contactId);

  return (
    <div className="space-y-4">
      {fileUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
          <div className="min-w-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              {filename}
            </a>
            <p className="text-xs text-zinc-500">
              Uploaded {uploadedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(uploadedAt) : "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => startTransition(() => setAgreementSigned(contactId, !signed))}
              disabled={togglePending}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                signed
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                  : "bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-zinc-700"
              }`}
            >
              {signed ? "Signed" : "Unsigned"}
            </button>
            <form action={removeWithId}>
              <ConfirmSubmitButton
                confirmMessage={`Remove ${filename}? This can't be undone.`}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-400"
              >
                Remove
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="file"
          name="file"
          required
          className="block flex-1 text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-300 hover:file:bg-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          {pending ? "Uploading…" : fileUrl ? "Replace" : "Upload"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {!fileUrl && <p className="text-xs text-zinc-500">No agreement on file yet.</p>}
    </div>
  );
}
