"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, Priority } from "@prisma/client";

export type ProjectFormState = { error?: string };

const STATUSES = Object.values(ProjectStatus);
const PRIORITIES = Object.values(Priority);

function parseProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const progressRaw = String(formData.get("progress") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

  const progress = progressRaw ? Math.round(Number(progressRaw)) : 0;

  return {
    name,
    contactId,
    status: STATUSES.includes(statusRaw as ProjectStatus)
      ? (statusRaw as ProjectStatus)
      : ProjectStatus.NOT_STARTED,
    priority: PRIORITIES.includes(priorityRaw as Priority)
      ? (priorityRaw as Priority)
      : Priority.MEDIUM,
    progress: Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
    dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
  };
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const fields = parseProjectFields(formData);
  if (!fields.name) return { error: "Project name is required." };
  if (!fields.contactId) return { error: "Select a client for this project." };

  const project = await prisma.project.create({ data: fields });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${fields.contactId}`);
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const fields = parseProjectFields(formData);
  if (!fields.name) return { error: "Project name is required." };
  if (!fields.contactId) return { error: "Select a client for this project." };

  const project = await prisma.project.update({
    where: { id: projectId },
    data: fields,
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);
  return {};
}

export async function updateProjectStatus(projectId: string, status: string) {
  if (!STATUSES.includes(status as ProjectStatus)) return;
  const data: { status: ProjectStatus; progress?: number } = {
    status: status as ProjectStatus,
  };
  if (status === "COMPLETED") data.progress = 100;

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);
}

export async function updateProjectProgress(projectId: string, progress: number) {
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
  const project = await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/contacts/${project.contactId}`);
  redirect(`/contacts/${project.contactId}`);
}
