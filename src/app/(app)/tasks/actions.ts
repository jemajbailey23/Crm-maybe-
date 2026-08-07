"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, addWeeks, addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Priority, TaskStatus, TaskRecurrence } from "@prisma/client";
import { validateTaskStatusTransition } from "./task-rules";

export type TaskFormState = { error?: string };
export type TaskDetailFormState = { error?: string };
export type TaskActionResult = { error?: string };

const PRIORITIES = Object.values(Priority);
const STATUSES = Object.values(TaskStatus);
const RECURRENCES = Object.values(TaskRecurrence);

function revalidateTaskPaths(task: {
  id: string;
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
  projectId: string | null;
  invoiceId: string | null;
}) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/next-actions");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.companyId) revalidatePath(`/companies/${task.companyId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
}

function nextDueDate(current: Date | null, recurrence: TaskRecurrence, intervalDays: number | null) {
  const base = current ?? new Date();
  if (recurrence === "DAILY") return addDays(base, 1);
  if (recurrence === "WEEKLY") return addWeeks(base, 1);
  if (recurrence === "MONTHLY") return addMonths(base, 1);
  if (recurrence === "CUSTOM") return addDays(base, Math.max(1, intervalDays ?? 1));
  return null;
}

// Guarded by nextInstanceCreated + a transaction so toggling a recurring
// task's status to Completed and back repeatedly can't spawn more than one
// next-occurrence task per completion.
async function maybeSpawnRecurrence(taskId: string) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.recurrence === "NONE" || task.nextInstanceCreated) return;

    await tx.task.create({
      data: {
        title: task.title,
        description: task.description,
        dueDate: nextDueDate(task.dueDate, task.recurrence, task.recurrenceIntervalDays),
        priority: task.priority,
        recurrence: task.recurrence,
        recurrenceIntervalDays: task.recurrenceIntervalDays,
        labels: task.labels,
        estimatedMinutes: task.estimatedMinutes,
        contactId: task.contactId,
        companyId: task.companyId,
        dealId: task.dealId,
        projectId: task.projectId,
        invoiceId: task.invoiceId,
        assignedToId: task.assignedToId,
      },
    });
    await tx.task.update({ where: { id: taskId }, data: { nextInstanceCreated: true } });
  });
}

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function date(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function intOrNull(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const num = Math.round(Number(raw));
  return Number.isNaN(num) ? null : num;
}

// ---- Simple quick-add (title + due date + whichever relation the embedding
// page is scoped to). Intentionally minimal — the full field set is only
// ever edited on the task detail page or the /tasks/new full-create form.
export async function createTask(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Task title is required." };
  }

  const user = await getCurrentUser();

  const task = await prisma.task.create({
    data: {
      title,
      dueDate: date(formData, "dueDate"),
      contactId: str(formData, "contactId"),
      companyId: str(formData, "companyId"),
      dealId: str(formData, "dealId"),
      projectId: str(formData, "projectId"),
      invoiceId: str(formData, "invoiceId"),
      assignedToId: user?.id ?? null,
    },
  });

  revalidateTaskPaths(task);
  return {};
}

function parseTaskFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const recurrenceRaw = String(formData.get("recurrence") ?? "").trim();

  return {
    title,
    description: str(formData, "description"),
    startDate: date(formData, "startDate"),
    dueDate: date(formData, "dueDate"),
    status: STATUSES.includes(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : TaskStatus.READY,
    priority: PRIORITIES.includes(priorityRaw as Priority) ? (priorityRaw as Priority) : Priority.MEDIUM,
    labels: str(formData, "labels"),
    assignedToId: str(formData, "assignedToId"),
    contactId: str(formData, "contactId"),
    companyId: str(formData, "companyId"),
    dealId: str(formData, "dealId"),
    projectId: str(formData, "projectId"),
    invoiceId: str(formData, "invoiceId"),
    recurrence: RECURRENCES.includes(recurrenceRaw as TaskRecurrence)
      ? (recurrenceRaw as TaskRecurrence)
      : TaskRecurrence.NONE,
    recurrenceIntervalDays: intOrNull(formData, "recurrenceIntervalDays"),
    estimatedMinutes: intOrNull(formData, "estimatedMinutes"),
    waitingReason: str(formData, "waitingReason"),
    blockedReason: str(formData, "blockedReason"),
    completionNotes: str(formData, "completionNotes"),
    completionEvidenceUrl: str(formData, "completionEvidenceUrl"),
  };
}

// ---- Full create form (/tasks/new), used when a task is created from a
// record other than the simple embedded quick-add.
export async function createTaskDetailed(
  _prevState: TaskDetailFormState,
  formData: FormData
): Promise<TaskDetailFormState> {
  const fields = parseTaskFields(formData);
  if (!fields.title) return { error: "Task title is required." };

  const gateError = validateTaskStatusTransition(fields.status, fields);
  if (gateError) return { error: gateError };

  const task = await prisma.task.create({
    data: {
      ...fields,
      completedAt: fields.status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidateTaskPaths(task);
  redirect(`/tasks/${task.id}`);
}

export async function updateTask(
  taskId: string,
  _prevState: TaskDetailFormState,
  formData: FormData
): Promise<TaskDetailFormState> {
  const fields = parseTaskFields(formData);
  if (!fields.title) return { error: "Task title is required." };

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { error: "Task not found." };

  const statusChanged = existing.status !== fields.status;
  if (statusChanged) {
    const gateError = validateTaskStatusTransition(fields.status, fields);
    if (gateError) return { error: gateError };
  }

  const progressRaw = String(formData.get("progress") ?? "").trim();
  const progress = progressRaw ? Math.round(Number(progressRaw)) : existing.progress;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...fields,
      progress: Number.isNaN(progress) ? existing.progress : Math.min(100, Math.max(0, progress)),
      completedAt:
        fields.status === "COMPLETED"
          ? (existing.status === "COMPLETED" ? existing.completedAt : new Date())
          : null,
      // Reopening a previously-completed recurring task clears the
      // once-per-completion recurrence guard, so completing it again later
      // can spawn another next occurrence.
      nextInstanceCreated:
        existing.status === "COMPLETED" && fields.status !== "COMPLETED" ? false : undefined,
      overdueNotified: fields.status !== existing.status ? false : undefined,
    },
  });

  if (statusChanged && fields.status === "COMPLETED") {
    await maybeSpawnRecurrence(task.id);
  }

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

// Quick status change from a list row (TaskStatusSelect). Same gate as the
// full form — Waiting/Blocked still require their reason to already be set,
// which nudges the user to the detail page to record it the first time.
export async function updateTaskStatus(taskId: string, status: string): Promise<TaskActionResult> {
  if (!STATUSES.includes(status as TaskStatus)) return { error: "Invalid status." };

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return { error: "Task not found." };

  const nextStatus = status as TaskStatus;
  if (existing.status !== nextStatus) {
    const gateError = validateTaskStatusTransition(nextStatus, existing);
    if (gateError) return { error: gateError };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      progress: nextStatus === "COMPLETED" ? 100 : undefined,
      completedAt:
        nextStatus === "COMPLETED"
          ? (existing.status === "COMPLETED" ? existing.completedAt : new Date())
          : nextStatus !== existing.status
            ? null
            : undefined,
      nextInstanceCreated:
        existing.status === "COMPLETED" && nextStatus !== "COMPLETED" ? false : undefined,
      overdueNotified: nextStatus !== existing.status ? false : undefined,
    },
  });

  if (existing.status !== "COMPLETED" && nextStatus === "COMPLETED") {
    await maybeSpawnRecurrence(task.id);
  }

  revalidateTaskPaths(task);
  return {};
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

// ---- Checklist

export async function addChecklistItem(taskId: string, _prevState: TaskActionResult, formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Enter a checklist item." };

  await prisma.taskChecklistItem.create({ data: { taskId, label } });
  revalidatePath(`/tasks/${taskId}`);
  return {};
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const item = await prisma.taskChecklistItem.update({
    where: { id: itemId },
    data: { done: !done },
  });
  revalidatePath(`/tasks/${item.taskId}`);
}

export async function deleteChecklistItem(itemId: string) {
  const item = await prisma.taskChecklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/tasks/${item.taskId}`);
}

// ---- Dependencies

export async function addDependency(taskId: string, dependsOnTaskId: string): Promise<TaskActionResult> {
  if (!dependsOnTaskId || dependsOnTaskId === taskId) {
    return { error: "Choose a different task to depend on." };
  }
  try {
    await prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } });
  } catch {
    return { error: "That dependency already exists." };
  }
  revalidatePath(`/tasks/${taskId}`);
  return {};
}

export async function removeDependency(dependencyId: string) {
  const dep = await prisma.taskDependency.delete({ where: { id: dependencyId } });
  revalidatePath(`/tasks/${dep.taskId}`);
}

// ---- Time tracking

export async function logTrackedTime(taskId: string, minutes: number): Promise<TaskActionResult> {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { error: "Enter a positive number of minutes." };
  }
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { trackedMinutes: { increment: Math.round(minutes) } },
  });
  revalidateTaskPaths(task);
  return {};
}

// ---- Bulk actions (Tasks list multi-select)

export async function bulkDeleteTasks(ids: string[]): Promise<TaskActionResult> {
  if (ids.length === 0) return { error: "No tasks selected." };
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

export async function bulkCompleteTasks(ids: string[]): Promise<TaskActionResult> {
  if (ids.length === 0) return { error: "No tasks selected." };

  const toComplete = await prisma.task.findMany({
    where: { id: { in: ids }, status: { not: "COMPLETED" } },
    select: { id: true, recurrence: true },
  });

  await prisma.task.updateMany({
    where: { id: { in: toComplete.map((t) => t.id) } },
    data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
  });

  // Recurring tasks each need their own spawn-guard transaction, so handle
  // those individually rather than in the bulk updateMany above.
  for (const task of toComplete) {
    if (task.recurrence !== "NONE") await maybeSpawnRecurrence(task.id);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

// ---- Create-from-record helper used by the Next Best Action panel: builds
// a task directly from a recommendation's context in one click, no form.
export async function createTaskFromNextAction(input: {
  title: string;
  dueDate: Date | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}): Promise<TaskActionResult> {
  const user = await getCurrentUser();
  const task = await prisma.task.create({
    data: {
      title: input.title,
      dueDate: input.dueDate,
      contactId: input.contactId ?? null,
      companyId: input.companyId ?? null,
      dealId: input.dealId ?? null,
      assignedToId: user?.id ?? null,
      description: "Created from a Next Best Action recommendation.",
    },
  });
  revalidateTaskPaths(task);
  return {};
}
