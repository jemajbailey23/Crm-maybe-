import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { DealStage } from "@prisma/client";

// Default "days in stage before it's flagged as stuck" for the Next Best
// Action stuck-in-stage rule. Only stages with a fixed day threshold are
// listed here — DISCOVERY_SCHEDULED (judged against its meeting date) and
// NURTURE (judged against its scheduled follow-up date) are handled
// specially in actions/rules.ts and never read from this map. WON/LOST are
// terminal stages and have no "stuck" concept.
export const DEFAULT_STAGE_THRESHOLD_DAYS: Partial<Record<DealStage, number>> = {
  NEW_LEAD: 2,
  RESEARCHING: 3,
  READY_TO_CONTACT: 2,
  CONTACTED: 5,
  DISCOVERY_COMPLETED: 2,
  PROPOSAL_SENT: 5,
  NEGOTIATION: 7,
};

// Stages with a day threshold that a human can configure in Settings, in
// display order.
export const CONFIGURABLE_THRESHOLD_STAGES: DealStage[] = [
  "NEW_LEAD",
  "RESEARCHING",
  "READY_TO_CONTACT",
  "CONTACTED",
  "DISCOVERY_COMPLETED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
];

export const getStageThresholds = cache(
  async (): Promise<Partial<Record<DealStage, number>>> => {
    const overrides = await prisma.pipelineStageThreshold.findMany();
    const thresholds = { ...DEFAULT_STAGE_THRESHOLD_DAYS };
    for (const o of overrides) {
      if (o.stage in thresholds) thresholds[o.stage] = o.days;
    }
    return thresholds;
  }
);
