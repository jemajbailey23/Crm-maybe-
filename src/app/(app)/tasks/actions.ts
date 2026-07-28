"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, addWeeks, addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Priority, TaskRecurrence } from "@prisma/client";

export type TaskFormState = { error?: string };

const PRIORITIES = Object.values(Priority);
const RECURRENCES = Object.values(TaskRecurrence);

function revalidateTaskPaths(task: {
  id: string;
  contactId: string | null;
  dealId: string | null;
  projectId: string | null;
}) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/dashboard");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
}

function nextDueDate(current: Date | null, recurrence: TaskRecurrence) {
  const base = current ?? new Date();
  if (recurrence === "DAILY") return addDays(base, 1);
  if (recurrence === "WEEKLY") return addWeeks(base, 1);
  if (recurrence === "MONTHLY") return addMonths(base, 1);
  return null;
}

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!title) {
    return { error: "Task title is required." };
  }

  const user = await getCurrentUser();

  const task = await prisma.task.create({
    data: {
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      notes: notes || null,
      contactId: contactId || null,
      dealId: dealId || null,
      projectId: projectId || null,
      assignedToId: user?.id ?? null,
    },
  });

  revalidateTaskPaths(task);
  if (redirectTo) revalidatePath(redirectTo);
  return {};
}

export type TaskDetailFormState = { error?: string };

export async function updateTask(
  taskId: string,
  _prevState: TaskDetailFormState,
  formData: FormData
): Promise<TaskDetailFormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Task title is required." };

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const labels = String(formData.get("labels") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const recurrenceRaw = String(formData.get("recurrence") ?? "").trim();
  const progressRaw = String(formData.get("progress") ?? "").trim();

  const progress = progressRaw ? Math.round(Number(progressRaw)) : 0;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      notes: notes || null,
      labels: labels || null,
      contactId: contactId || null,
      dealId: dealId || null,
      projectId: projectId || null,
      priority: PRIORITIES.includes(priorityRaw as Priority)
        ? (priorityRaw as Priority)
        : Priority.MEDIUM,
      recurrence: RECURRENCES.includes(recurrenceRaw as TaskRecurrence)
        ? (recurrenceRaw as TaskRecurrence)
        : TaskRecurrence.NONE,
      progress: Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
    },
  });

  revalidateTaskPaths(task);
  return {};
}

export async function updateTaskProgress(taskId: string, progress: number) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { progress: clamped },
  });
  revalidateTaskPaths(task);
}

export async function toggleTaskStatus(
  taskId: string,
  currentStatus: "OPEN" | "DONE"
) {
  const nextStatus = currentStatus === "OPEN" ? "DONE" : "OPEN";

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      progress: nextStatus === "DONE" ? 100 : undefined,
    },
  });

  if (nextStatus === "DONE" && task.recurrence !== "NONE") {
    await prisma.task.create({
      data: {
        title: task.title,
        dueDate: nextDueDate(task.dueDate, task.recurrence),
        notes: task.notes,
        labels: task.labels,
        priority: task.priority,
        recurrence: task.recurrence,
        contactId: task.contactId,
        dealId: task.dealId,
        projectId: task.projectId,
        assignedToId: task.assignedToId,
      },
    });
  }

  revalidateTaskPaths(task);
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidateTaskPaths(task);
}

export async function deleteTaskFromDetail(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidateTaskPaths(task);
  redirect("/tasks");
}
