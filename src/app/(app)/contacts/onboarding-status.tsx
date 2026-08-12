"use client";

import { useState, useTransition } from "react";
import { sendOnboardingFormAction } from "./onboarding-actions";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function OnboardingFormStatus({
  contactId,
  sentAt,
  submittedAt,
}: {
  contactId: string;
  sentAt: Date | null;
  submittedAt: Date | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendOnboardingFormAction(contactId);
      setMessage(result.error ?? "Sent!");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-sm text-zinc-400">
        {submittedAt ? (
          <span className="text-emerald-400">Submitted {fmt(submittedAt)}</span>
        ) : sentAt ? (
          <span>Sent {fmt(sentAt)} — not yet submitted</span>
        ) : (
          <span className="text-zinc-500">Not sent yet</span>
        )}
      </div>
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:opacity-50"
      >
        {pending ? "Sending…" : sentAt ? "Resend" : "Send onboarding form"}
      </button>
      {message && <span className="text-xs text-zinc-500">{message}</span>}
    </div>
  );
}
