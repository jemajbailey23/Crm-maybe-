import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { DealStage } from "@prisma/client";
import { STAGE_ORDER, DEFAULT_STAGE_LABELS, stageOptions } from "@/lib/pipeline-stage-constants";

// Re-exported so existing server-side imports of this file keep working
// unchanged — the client-safe constants now live in
// pipeline-stage-constants.ts (see that file for why).
export { STAGE_ORDER, DEFAULT_STAGE_LABELS, stageOptions };

export const getStageLabels = cache(async (): Promise<Record<DealStage, string>> => {
  const overrides = await prisma.pipelineStageLabel.findMany();
  const labels = { ...DEFAULT_STAGE_LABELS };
  for (const o of overrides) labels[o.stage] = o.label;
  return labels;
});
