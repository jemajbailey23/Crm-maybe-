"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type TaskFormState = { error?: string };

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!title) {
    return { error: "Task title is required." };
  }

  const user = await getCurrentUser();

  await prisma.task.create({
    data: {
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      notes: notes || null,
      contactId: contactId || null,
      dealId: dealId || null,
      assignedToId: user?.id ?? null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (redirectTo) revalidatePath(redirectTo);
  return {};
}

export async function toggleTaskStatus(
  taskId: string,
  currentStatus: "OPEN" | "DONE"
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: currentStatus === "OPEN" ? "DONE" : "OPEN" },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
  if (task.dealId) revalidatePath(`/deals/${task.dealId}`);
}
