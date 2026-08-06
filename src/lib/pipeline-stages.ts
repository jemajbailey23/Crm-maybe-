import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
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

export const getStageLabels = cache(async (): Promise<Record<DealStage, string>> => {
  const overrides = await prisma.pipelineStageLabel.findMany();
  const labels = { ...DEFAULT_STAGE_LABELS };
  for (const o of overrides) labels[o.stage] = o.label;
  return labels;
});

export function stageOptions(labels: Record<DealStage, string>) {
  return STAGE_ORDER.map((value) => ({ value, label: labels[value] }));
}
