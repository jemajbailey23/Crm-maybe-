// Client-safe pipeline-stage constants — no "server-only"/prisma import, so
// this can be pulled into Client Components (e.g. the meeting-type form's
// "related pipeline stage" dropdown) without dragging in the DB-backed
// getStageLabels() from pipeline-stages.ts, which real Server Components
// still use for the full (override-aware) label set.
import type { DealStage } from "@prisma/client";

export const STAGE_ORDER: DealStage[] = [
  "NEW_LEAD",
  "RESEARCHING",
  "READY_TO_CONTACT",
  "CONTACTED",
  "DISCOVERY_SCHEDULED",
  "DISCOVERY_COMPLETED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NURTURE",
];

export const DEFAULT_STAGE_LABELS: Record<DealStage, string> = {
  NEW_LEAD: "New Lead",
  RESEARCHING: "Researching",
  READY_TO_CONTACT: "Ready to Contact",
  CONTACTED: "Contacted",
  DISCOVERY_SCHEDULED: "Discovery Scheduled",
  DISCOVERY_COMPLETED: "Discovery Completed",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  NURTURE: "Nurture",
};

export function stageOptions(labels: Record<DealStage, string>) {
  return STAGE_ORDER.map((value) => ({ value, label: labels[value] }));
}
