"use client";

import { useTransition } from "react";
import { updateContractStatus } from "./actions";

const STATUSES: { value: string; label: string }[] = [
  { value: "NOT_SENT", label: "Not sent" },
  { value: "SENT", label: "Sent" },
  { value: "SIGNED", label: "Signed" },
  { value: "EXPIRED", label: "Expired" },
];

export function ContractStatusSelect({
  contactId,
  status,
}: {
  contactId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateContractStatus(contactId, next);
        });
      }}
      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
