"use client";

import { useActionState, useRef } from "react";
import { uploadAttachment, type AttachmentFormState } from "./attachments-actions";

const initialState: AttachmentFormState = {};

export function AttachmentUploadForm({ contactId }: { contactId: string }) {
  const action = uploadAttachment.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="file"
        type="file"
        required
        className="flex-1 min-w-[12rem] text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
