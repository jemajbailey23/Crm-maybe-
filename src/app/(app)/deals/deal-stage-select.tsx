"use client";

import { useTransition } from "react";
import { updateDealStage } from "./actions";

const STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function DealStageSelect({
  dealId,
  stage,
}: {
  dealId: string;
  stage: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={stage}
      disabled={isPending}
      onChange={(e) => {
        const nextStage = e.target.value;
        startTransition(() => {
          updateDealStage(dealId, nextStage);
        });
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
