"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { GoalMetric, GoalPeriod } from "@prisma/client";

export async function upsertGoal(
  metric: GoalMetric,
  period: GoalPeriod,
  target: number
) {
  const user = await requireUser();
  const clamped = Math.max(0, Number.isFinite(target) ? target : 0);

  await prisma.goal.upsert({
    where: { userId_metric_period: { userId: user.id, metric, period } },
    update: { target: clamped },
    create: { userId: user.id, metric, period, target: clamped },
  });

  revalidatePath("/performance");
}
