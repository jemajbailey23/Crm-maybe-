"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AutomationActionType, AutomationTrigger } from "@prisma/client";
import { TRIGGERS, ACTION_TYPES } from "./meta";

export type AutomationFormState = { error?: string };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const triggerRaw = String(formData.get("trigger") ?? "").trim();
  const actionTypeRaw = String(formData.get("actionType") ?? "").trim();
  const taskDueInDaysRaw = String(formData.get("taskDueInDays") ?? "").trim();

  return {
    name,
    trigger: TRIGGERS.includes(triggerRaw as AutomationTrigger)
      ? (triggerRaw as AutomationTrigger)
      : null,
    actionType: ACTION_TYPES.includes(actionTypeRaw as AutomationActionType)
      ? (actionTypeRaw as AutomationActionType)
      : null,
    taskTitle: str(formData, "taskTitle"),
    taskDueInDays: taskDueInDaysRaw ? Math.max(0, Math.round(Number(taskDueInDaysRaw))) : null,
    emailSubject: str(formData, "emailSubject"),
    emailBody: str(formData, "emailBody"),
    webhookUrl: str(formData, "webhookUrl"),
  };
}

export async function createAutomationRule(
  _prevState: AutomationFormState,
  formData: FormData
): Promise<AutomationFormState> {
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Give this automation a name." };
  if (!fields.trigger) return { error: "Choose a trigger." };
  if (!fields.actionType) return { error: "Choose an action." };
  if (fields.actionType === "WEBHOOK" && !fields.webhookUrl) {
    return { error: "Enter a webhook URL." };
  }

  const rule = await prisma.automationRule.create({
    data: {
      name: fields.name,
      trigger: fields.trigger,
      actionType: fields.actionType,
      taskTitle: fields.taskTitle,
      taskDueInDays: fields.taskDueInDays,
      emailSubject: fields.emailSubject,
      emailBody: fields.emailBody,
      webhookUrl: fields.webhookUrl,
    },
  });

  revalidatePath("/automations");
  redirect(`/automations/${rule.id}`);
}

export async function updateAutomationRule(
  ruleId: string,
  _prevState: AutomationFormState,
  formData: FormData
): Promise<AutomationFormState> {
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Give this automation a name." };
  if (!fields.trigger) return { error: "Choose a trigger." };
  if (!fields.actionType) return { error: "Choose an action." };
  if (fields.actionType === "WEBHOOK" && !fields.webhookUrl) {
    return { error: "Enter a webhook URL." };
  }

  await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      name: fields.name,
      trigger: fields.trigger,
      actionType: fields.actionType,
      taskTitle: fields.taskTitle,
      taskDueInDays: fields.taskDueInDays,
      emailSubject: fields.emailSubject,
      emailBody: fields.emailBody,
      webhookUrl: fields.webhookUrl,
    },
  });

  revalidatePath("/automations");
  revalidatePath(`/automations/${ruleId}`);
  return {};
}

export async function toggleAutomationRule(ruleId: string, enabled: boolean) {
  await prisma.automationRule.update({
    where: { id: ruleId },
    data: { enabled },
  });
  revalidatePath("/automations");
  revalidatePath(`/automations/${ruleId}`);
}

export async function deleteAutomationRule(ruleId: string) {
  await prisma.automationRule.delete({ where: { id: ruleId } });
  revalidatePath("/automations");
  redirect("/automations");
}
