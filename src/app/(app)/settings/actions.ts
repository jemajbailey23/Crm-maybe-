"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DealStage } from "@prisma/client";
import { STAGE_ORDER, DEFAULT_STAGE_LABELS } from "@/lib/pipeline-stages";
import { isBrandColorKey } from "@/lib/brand-colors";

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
