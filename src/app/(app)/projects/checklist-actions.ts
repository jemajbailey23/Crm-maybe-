"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ChecklistFormState = { error?: string };

export async function addChecklistItem(
  projectId: string,
  _prevState: ChecklistFormState,
  formData: FormData
): Promise<ChecklistFormState> {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Checklist item can't be empty." };

  await prisma.checklistItem.create({ data: { projectId, label } });
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function toggleChecklistItem(
  itemId: string,
  currentDone: boolean
) {
  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: !currentDone },
  });
  revalidatePath(`/projects/${item.projectId}`);
}

export async function deleteChecklistItem(itemId: string) {
  const item = await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/projects/${item.projectId}`);
}
