import "server-only";
import { prisma } from "@/lib/prisma";
import type { NBAPriority, NextBestActionItem } from "@prisma/client";

export const PRIORITY_RANK: Record<NBAPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function byPriorityThenDue(a: NextBestActionItem, b: NextBestActionItem) {
  const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (rankDiff !== 0) return rankDiff;
  const aTime = a.dueDate?.getTime() ?? Infinity;
  const bTime = b.dueDate?.getTime() ?? Infinity;
  return aTime - bTime;
}

// Top active/snoozed-expired-back-to-active recommendations, highest
// priority first, for the dashboard's compact panel.
export async function getTopActiveNextActions(limit: number) {
  const [items, totalActive] = await Promise.all([
    prisma.nextBestActionItem.findMany({ where: { status: "ACTIVE" } }),
    prisma.nextBestActionItem.count({ where: { status: "ACTIVE" } }),
  ]);
  items.sort(byPriorityThenDue);
  return { items: items.slice(0, limit), totalActive };
}
