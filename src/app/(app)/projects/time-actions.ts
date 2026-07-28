"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type TimeEntryFormState = { error?: string };

export async function addTimeEntry(
  projectId: string,
  _prevState: TimeEntryFormState,
  formData: FormData
): Promise<TimeEntryFormState> {
  const hoursRaw = String(formData.get("hours") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const hours = Number(hoursRaw);
  if (!hoursRaw || Number.isNaN(hours) || hours <= 0) {
    return { error: "Enter a valid number of hours." };
  }

  await prisma.timeEntry.create({
    data: {
      projectId,
      minutes: Math.round(hours * 60),
      description: description || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteTimeEntry(entryId: string) {
  const entry = await prisma.timeEntry.delete({ where: { id: entryId } });
  revalidatePath(`/projects/${entry.projectId}`);
}
