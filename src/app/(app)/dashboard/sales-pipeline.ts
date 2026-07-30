import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";
import type { DealStage } from "@prisma/client";

const STAGE_PROBABILITY: Record<DealStage, number> = {
  NEW: 0.1,
  CONTACTED: 0.25,
  PROPOSAL: 0.5,
  WON: 1,
  LOST: 0,
};

const STALE_DEAL_DAYS = 10;

export async function getSalesPipelineStats(now: Date) {
  const [openDeals, lastActivityByDeal] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      select: { id: true, stage: true, value: true, createdAt: true },
    }),
    prisma.activity.groupBy({
      by: ["dealId"],
      where: { dealId: { not: null } },
      _max: { occurredAt: true },
    }),
  ]);

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const weightedPipelineValue = openDeals.reduce(
    (sum, d) => sum + (d.value ?? 0) * STAGE_PROBABILITY[d.stage],
    0
  );
  const averageDealAgeDays =
    openDeals.length > 0
      ? Math.round(
          openDeals.reduce((sum, d) => sum + differenceInCalendarDays(now, d.createdAt), 0) /
            openDeals.length
        )
      : null;

  const lastActivityMap = new Map(
    lastActivityByDeal
      .filter((r) => r.dealId)
      .map((r) => [r.dealId as string, r._max.occurredAt])
  );
  const dealsAtRisk = openDeals.filter((d) => {
    const last = lastActivityMap.get(d.id) ?? d.createdAt;
    return differenceInCalendarDays(now, last) >= STALE_DEAL_DAYS;
  }).length;

  return {
    totalPipelineValue,
    weightedPipelineValue,
    averageDealAgeDays,
    dealsAtRisk,
    openDealCount: openDeals.length,
  };
}
