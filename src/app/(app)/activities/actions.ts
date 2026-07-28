"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ActivityType } from "@prisma/client";
import { fireAutomationTrigger } from "@/lib/automations";

export type ActivityFormState = { error?: string };

const TYPES = Object.values(ActivityType);

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const summary = String(formData.get("summary") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const missed = formData.get("missed") === "on";

  if (!summary) {
    return { error: "Activity summary is required." };
  }

  const type = TYPES.includes(typeRaw as ActivityType)
    ? (typeRaw as ActivityType)
    : ActivityType.NOTE;

  const user = await getCurrentUser();

  await prisma.activity.create({
    data: {
      summary,
      type,
      missed: type === "CALL" ? missed : false,
      contactId: contactId || null,
      dealId: dealId || null,
      projectId: projectId || null,
      createdById: user?.id ?? null,
    },
  });

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");

  if (type === "PROPOSAL") {
    await fireAutomationTrigger("PROPOSAL_SENT", { contactId: contactId || undefined, summary });
  }
  if (type === "CALL" && missed) {
    await fireAutomationTrigger("MISSED_CALL", { contactId: contactId || undefined, summary });
  }

  return {};
}

export async function deleteActivity(activityId: string) {
  const activity = await prisma.activity.delete({
    where: { id: activityId },
  });
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  if (activity.dealId) revalidatePath(`/deals/${activity.dealId}`);
  if (activity.projectId) revalidatePath(`/projects/${activity.projectId}`);
  revalidatePath("/dashboard");
}
