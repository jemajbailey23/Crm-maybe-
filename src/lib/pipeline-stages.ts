import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { DealStage } from "@prisma/client";

export const STAGE_ORDER: DealStage[] = ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"];

export const DEFAULT_STAGE_LABELS: Record<DealStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
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
