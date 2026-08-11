"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DealStage } from "@prisma/client";
import { STAGE_ORDER, DEFAULT_STAGE_LABELS } from "@/lib/pipeline-stages";
import { CONFIGURABLE_THRESHOLD_STAGES } from "@/lib/stage-thresholds";
import { isBrandColorKey } from "@/lib/brand-colors";
import { sendPushToUser } from "@/lib/push";

const LANDING_PAGES = ["/dashboard", "/tasks", "/performance", "/deals", "/projects"];

export async function updateStageLabel(stage: DealStage, label: string) {
  if (!STAGE_ORDER.includes(stage)) return;
  const trimmed = label.trim();

  if (!trimmed || trimmed === DEFAULT_STAGE_LABELS[stage]) {
    await prisma.pipelineStageLabel.deleteMany({ where: { stage } });
  } else {
    await prisma.pipelineStageLabel.upsert({
      where: { stage },
      update: { label: trimmed },
      create: { stage, label: trimmed },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
}

export async function addServiceType(_prevState: { error?: string }, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a service type name." };

  try {
    await prisma.serviceType.create({ data: { name } });
  } catch {
    return { error: "That service type already exists." };
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteServiceType(id: string) {
  await prisma.serviceType.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function addTaskLabel(_prevState: { error?: string }, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a task label." };

  try {
    await prisma.taskLabelPreset.create({ data: { name } });
  } catch {
    return { error: "That label already exists." };
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteTaskLabel(id: string) {
  await prisma.taskLabelPreset.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function updateStageThreshold(stage: DealStage, days: number) {
  if (!CONFIGURABLE_THRESHOLD_STAGES.includes(stage)) {
    return { error: "That stage doesn't use a fixed day threshold." };
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { error: "Enter a whole number of days between 1 and 365." };
  }

  await prisma.pipelineStageThreshold.upsert({
    where: { stage },
    update: { days },
    create: { stage, days },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/next-actions");
  return {};
}

export async function updateBrandColor(color: string) {
  if (!isBrandColorKey(color)) return;
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { brandColor: color } });
  revalidatePath("/", "layout");
}

export async function updateDefaultLandingPage(path: string) {
  if (!LANDING_PAGES.includes(path)) return;
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { defaultLandingPage: path } });
  revalidatePath("/settings");
}

export async function subscribeToPush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { error: "Incomplete subscription from the browser — try again." };
  }

  // upsert on endpoint (not create): re-enabling on the same
  // browser/device after a previous unsubscribe reuses the same endpoint
  // on most browsers, so this keeps it to one row instead of erroring or
  // duplicating.
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent, userId: user.id },
    create: {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
      userId: user.id,
    },
  });

  revalidatePath("/settings");
  return {};
}

export async function unsubscribeFromPush(id: string) {
  const user = await requireUser();
  // Scoped to this user's own subscriptions — moot in today's single-user
  // CRM, but cheap correctness insurance against an id from somewhere it
  // shouldn't be.
  await prisma.pushSubscription.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/settings");
}

export async function sendTestPushNotification(): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await sendPushToUser(user.id, {
      title: "Test notification",
      body: "If you can see this, push notifications are working.",
      url: "/settings",
    });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send a test notification." };
  }
}
