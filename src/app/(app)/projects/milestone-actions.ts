"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type MilestoneFormState = { error?: string };

export async function addMilestone(
  projectId: string,
  _prevState: MilestoneFormState,
  formData: FormData
): Promise<MilestoneFormState> {
  await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Milestone title can't be empty." };

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return { error: "Invalid due date." };

  const count = await prisma.projectMilestone.count({ where: { projectId } });
  await prisma.projectMilestone.create({ data: { projectId, title, dueDate, order: count } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function toggleMilestone(milestoneId: string, currentlyDone: boolean) {
  await requireUser();
  const milestone = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: { completedAt: currentlyDone ? null : new Date() },
  });
  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteMilestone(milestoneId: string) {
  await requireUser();
  const milestone = await prisma.projectMilestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/dashboard");
}
