"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function updateProfitMargin(percent: number) {
  const user = await requireUser();
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  await prisma.user.update({
    where: { id: user.id },
    data: { profitMarginPercent: clamped },
  });

  revalidatePath("/financials");
}
