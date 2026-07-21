"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ActivityType } from "@prisma/client";

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
      contactId: contactId || null,
      dealId: dealId || null,
      createdById: user?.id ?? null,
    },
  });

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteActivity(activityId: string) {
  const activity = await prisma.activity.delete({
    where: { id: activityId },
  });
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  if (activity.dealId) revalidatePath(`/deals/${activity.dealId}`);
  revalidatePath("/dashboard");
}
