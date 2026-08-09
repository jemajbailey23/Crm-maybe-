"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, Priority } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { fireAutomationTrigger } from "@/lib/automations";
import { applyProjectTemplate } from "./apply-template";

export type ProjectFormState = { error?: string };

const STATUSES = Object.values(ProjectStatus);
const PRIORITIES = Object.values(Priority);
function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function money(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function date(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const progressRaw = String(formData.get("progress") ?? "").trim();
  const progress = progressRaw ? Math.round(Number(progressRaw)) : 0;

  return {
    name,
    contactId,
    companyId: str(formData, "companyId"),
    ownerId: str(formData, "ownerId"),
    service: str(formData, "service"),
    status: STATUSES.includes(statusRaw as ProjectStatus) ? (statusRaw as ProjectStatus) : ProjectStatus.NOT_STARTED,
    priority: PRIORITIES.includes(priorityRaw as Priority) ? (priorityRaw as Priority) : Priority.MEDIUM,
    progress: Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
    startDate: date(formData, "startDate"),
    targetCompletionDate: date(formData, "targetCompletionDate"),
    actualCompletionDate: date(formData, "actualCompletionDate"),
    hoursBudgeted: money(formData, "hoursBudgeted"),
    estimatedDeliveryCost: money(formData, "estimatedDeliveryCost"),
    estimatedProfitability: money(formData, "estimatedProfitability"),
    blockedReason: str(formData, "blockedReason"),
    waitingReason: str(formData, "waitingReason"),
    internalNotes: str(formData, "internalNotes"),
    clientFacingNotes: str(formData, "clientFacingNotes"),
  };
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  const fields = parseProjectFields(formData);
  if (!fields.name) return { error: "Project name is required." };
  if (!fields.contactId) return { error: "Select a client for this project." };

  const templateId = str(formData, "templateId");
  if (templateId) {
    const template = await prisma.projectTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
    if (!template) return { error: "Selected template no longer exists." };
  }

  const project = await prisma.project.create({
    data: { ...fields, ownerId: fields.ownerId ?? user.id, templateId },
  });

  if (templateId) {
    await applyProjectTemplate(project.id, templateId, fields.startDate);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${fields.contactId}`);
  redirect(`/projects/${project.id}`);
}

async function fireProjectCompletionAutomations(project: {
  name: string;
  contactId: string;
  contact: { firstName: string; lastName: string; businessName: string | null };
}) {
  const clientName =
    project.contact.businessName || `${project.contact.firstName} ${project.contact.lastName}`;

  await fireAutomationTrigger("REVIEW_REQUEST", {
    contactId: project.contactId,
    summary: `${project.name} for ${clientName}`,
  });

  if (project.name.toLowerCase().includes("website")) {
    await fireAutomationTrigger("WEBSITE_PUBLISHED", {
      contactId: project.contactId,
      summary: `${project.name} for ${clientName}`,
    });
  }
}

export async function updateProject(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireUser();
  const fields = parseProjectFields(formData);
  if (!fields.name) return { error: "Project name is required." };
  if (!fields.contactId) return { error: "Select a client for this project." };

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });
  if (!existing) return { error: "Project not found." };

  const statusChanged = existing.status !== fields.status;
  const now = new Date();
  const becameCompleted = fields.status === "COMPLETED" && existing.status !== "COMPLETED";

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...fields,
      statusEnteredAt: statusChanged ? now : undefined,
      actualCompletionDate: becameCompleted ? (fields.actualCompletionDate ?? now) : fields.actualCompletionDate,
      progress: fields.status === "COMPLETED" ? 100 : fields.progress,
    },
    include: { contact: true },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);

  if (becameCompleted) {
    await fireProjectCompletionAutomations(project);
  }

  return {};
}

export async function updateProjectStatus(projectId: string, status: string) {
  await requireUser();
  if (!STATUSES.includes(status as ProjectStatus)) return;

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });
  if (!existing) return;

  const now = new Date();
  const becameCompleted = status === "COMPLETED" && existing.status !== "COMPLETED";
  const data: {
    status: ProjectStatus;
    progress?: number;
    statusEnteredAt: Date;
    actualCompletionDate?: Date;
  } = {
    status: status as ProjectStatus,
    statusEnteredAt: now,
  };
  if (status === "COMPLETED") {
    data.progress = 100;
    data.actualCompletionDate = now;
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    include: { contact: true },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);

  if (becameCompleted) {
    await fireProjectCompletionAutomations(project);
  }
}

export async function updateProjectProgress(projectId: string, progress: number) {
  await requireUser();
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { progress: clamped },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);
}

export async function deleteProject(projectId: string) {
  await requireUser();
  const project = await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);
  redirect(`/contacts/${project.contactId}`);
}
