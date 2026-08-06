"use client";

import { useState, useTransition } from "react";
import { updateDealStage } from "./actions";

const DEFAULT_STAGES: { value: string; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "READY_TO_CONTACT", label: "Ready to Contact" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DISCOVERY_SCHEDULED", label: "Discovery Scheduled" },
  { value: "DISCOVERY_COMPLETED", label: "Discovery Completed" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "NURTURE", label: "Nurture" },
];

export function DealStageSelect({
  dealId,
  stage,
  stages = DEFAULT_STAGES,
}: {
  dealId: string;
  stage: string;
  stages?: { value: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  // Locally controlled so a rejected transition can snap back to the real
  // value immediately, instead of leaving the dropdown showing a stage
  // that was never actually saved.
  const [localStage, setLocalStage] = useState(stage);
  const [error, setError] = useState<string | null>(null);
  // Adjust local state during render (React's documented escape hatch) when
  // the prop changes from outside — e.g. another tab moving the deal —
  // instead of syncing via a useEffect, which would cause an extra render.
  const [prevStage, setPrevStage] = useState(stage);
  if (stage !== prevStage) {
    setPrevStage(stage);
    setLocalStage(stage);
  }

  function handleChange(nextStage: string) {
    const previousStage = localStage;
    setLocalStage(nextStage);
    setError(null);
    startTransition(async () => {
      const result = await updateDealStage(dealId, nextStage);
      if (result?.error) {
        setLocalStage(previousStage);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <select
        value={localStage}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      >
        {stages.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-[11px] leading-snug text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
