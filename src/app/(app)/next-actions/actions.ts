"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type NBAActionResult = { error?: string };

function revalidateNextActionPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/next-actions");
}

export async function completeNextAction(id: string): Promise<NBAActionResult> {
  const item = await prisma.nextBestActionItem.findUnique({ where: { id } });
  if (!item) return { error: "That recommendation no longer exists." };

  await prisma.nextBestActionItem.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date(), snoozedUntil: null, dismissedAt: null },
  });
  revalidateNextActionPaths();
  return {};
}

export async function dismissNextAction(id: string): Promise<NBAActionResult> {
  const item = await prisma.nextBestActionItem.findUnique({ where: { id } });
  if (!item) return { error: "That recommendation no longer exists." };

  await prisma.nextBestActionItem.update({
    where: { id },
    data: { status: "DISMISSED", dismissedAt: new Date(), snoozedUntil: null, completedAt: null },
  });
  revalidateNextActionPaths();
  return {};
}

export async function snoozeNextAction(id: string, until: string): Promise<NBAActionResult> {
  const item = await prisma.nextBestActionItem.findUnique({ where: { id } });
  if (!item) return { error: "That recommendation no longer exists." };

  const snoozedUntil = new Date(until);
  if (Number.isNaN(snoozedUntil.getTime())) {
    return { error: "Choose a valid snooze date." };
  }
  if (snoozedUntil <= new Date()) {
    return { error: "Snooze date must be in the future." };
  }

  await prisma.nextBestActionItem.update({
    where: { id },
    data: { status: "SNOOZED", snoozedUntil, completedAt: null, dismissedAt: null },
  });
  revalidateNextActionPaths();
  return {};
}

// Manually bring a completed/dismissed/snoozed recommendation back to
// active, in case someone changes their mind from the Next Actions view.
export async function reopenNextAction(id: string): Promise<NBAActionResult> {
  const item = await prisma.nextBestActionItem.findUnique({ where: { id } });
  if (!item) return { error: "That recommendation no longer exists." };

  await prisma.nextBestActionItem.update({
    where: { id },
    data: { status: "ACTIVE", snoozedUntil: null, completedAt: null, dismissedAt: null },
  });
  revalidateNextActionPaths();
  return {};
}
