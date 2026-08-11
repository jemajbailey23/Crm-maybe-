"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { runRuleActionsNow, type TestRunActionResult } from "@/lib/automations";
import { AutomationActionType, AutomationEmailRecipient, AutomationTrigger } from "@prisma/client";
import { TRIGGERS, ACTION_TYPES, EMAIL_RECIPIENTS } from "./meta";

export type AutomationFormState = { error?: string };
export type TestRunState = { results?: TestRunActionResult[]; error?: string };

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type ParsedAction = {
  id: string | null;
  actionType: AutomationActionType | null;
  taskTitle: string | null;
  taskDueInDays: number | null;
  emailRecipient: AutomationEmailRecipient;
  emailSubject: string | null;
  emailBody: string | null;
  webhookUrl: string | null;
  pushTitle: string | null;
  pushBody: string | null;
};

function parseAction(formData: FormData, i: number): ParsedAction {
  const actionTypeRaw = String(formData.get(`action-${i}-actionType`) ?? "").trim();
  const emailRecipientRaw = String(formData.get(`action-${i}-emailRecipient`) ?? "").trim();
  const taskDueInDaysRaw = String(formData.get(`action-${i}-taskDueInDays`) ?? "").trim();

  return {
    id: str(formData, `action-${i}-id`),
    actionType: ACTION_TYPES.includes(actionTypeRaw as AutomationActionType)
      ? (actionTypeRaw as AutomationActionType)
      : null,
    taskTitle: str(formData, `action-${i}-taskTitle`),
    taskDueInDays: taskDueInDaysRaw ? Math.max(0, Math.round(Number(taskDueInDaysRaw))) : null,
    emailRecipient: EMAIL_RECIPIENTS.includes(emailRecipientRaw as AutomationEmailRecipient)
      ? (emailRecipientRaw as AutomationEmailRecipient)
      : ("OWNER" as AutomationEmailRecipient),
    emailSubject: str(formData, `action-${i}-emailSubject`),
    emailBody: str(formData, `action-${i}-emailBody`),
    webhookUrl: str(formData, `action-${i}-webhookUrl`),
    pushTitle: str(formData, `action-${i}-pushTitle`),
    pushBody: str(formData, `action-${i}-pushBody`),
  };
}

// The form submits one action block per "add another action" click, indexed
// 0..actionCount-1 (see automation-form.tsx) rather than repeated same-name
// fields — the different action types show different fields, so a flat
// index-per-block is simpler to reconcile than zipping same-name arrays.
function parseActions(formData: FormData): ParsedAction[] {
  const count = Math.max(0, Math.min(20, Math.round(Number(formData.get("actionCount") ?? 0))));
  const actions: ParsedAction[] = [];
  for (let i = 0; i < count; i++) actions.push(parseAction(formData, i));
  return actions;
}

function validateActions(actions: ParsedAction[]): string | null {
  if (actions.length === 0) return "Add at least one action.";
  for (const [idx, a] of actions.entries()) {
    if (!a.actionType) return `Choose an action for step ${idx + 1}.`;
    if (a.actionType === "WEBHOOK" && !a.webhookUrl) {
      return `Enter a webhook URL for step ${idx + 1}.`;
    }
    if (a.actionType === "SEND_EMAIL" && a.emailRecipient === "CONTACT" && (!a.emailSubject || !a.emailBody)) {
      return `Write a subject and message for step ${idx + 1} — the contact will see these directly.`;
    }
  }
  return null;
}

function actionCreateData(a: ParsedAction, order: number) {
  return {
    order,
    actionType: a.actionType!,
    taskTitle: a.taskTitle,
    taskDueInDays: a.taskDueInDays,
    emailRecipient: a.emailRecipient,
    emailSubject: a.emailSubject,
    emailBody: a.emailBody,
    webhookUrl: a.webhookUrl,
    pushTitle: a.pushTitle,
    pushBody: a.pushBody,
  };
}

export async function createAutomationRule(
  _prevState: AutomationFormState,
  formData: FormData
): Promise<AutomationFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const triggerRaw = String(formData.get("trigger") ?? "").trim();
  const trigger = TRIGGERS.includes(triggerRaw as AutomationTrigger) ? (triggerRaw as AutomationTrigger) : null;
  const actions = parseActions(formData);

  if (!name) return { error: "Give this automation a name." };
  if (!trigger) return { error: "Choose a trigger." };
  const actionsError = validateActions(actions);
  if (actionsError) return { error: actionsError };

  const rule = await prisma.automationRule.create({
    data: {
      name,
      trigger,
      actions: { create: actions.map(actionCreateData) },
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
  const name = String(formData.get("name") ?? "").trim();
  const triggerRaw = String(formData.get("trigger") ?? "").trim();
  const trigger = TRIGGERS.includes(triggerRaw as AutomationTrigger) ? (triggerRaw as AutomationTrigger) : null;
  const actions = parseActions(formData);

  if (!name) return { error: "Give this automation a name." };
  if (!trigger) return { error: "Choose a trigger." };
  const actionsError = validateActions(actions);
  if (actionsError) return { error: actionsError };

  const existingIds = (await prisma.automationAction.findMany({ where: { ruleId }, select: { id: true } })).map(
    (a) => a.id
  );
  // A submitted action's id came back from a hidden form field — only trust
  // it as "update this row" if it's actually one of this rule's own
  // existing actions, otherwise treat it as a new action.
  const sanitized = actions.map((a) => ({ ...a, id: a.id && existingIds.includes(a.id) ? a.id : null }));
  const keepIds = new Set(sanitized.filter((a) => a.id).map((a) => a.id as string));
  const idsToDelete = existingIds.filter((id) => !keepIds.has(id));

  await prisma.$transaction([
    ...(idsToDelete.length > 0 ? [prisma.automationAction.deleteMany({ where: { id: { in: idsToDelete } } })] : []),
    prisma.automationRule.update({ where: { id: ruleId }, data: { name, trigger } }),
    ...sanitized.map((a, order) =>
      a.id
        ? prisma.automationAction.update({ where: { id: a.id }, data: actionCreateData(a, order) })
        : prisma.automationAction.create({ data: { ruleId, ...actionCreateData(a, order) } })
    ),
  ]);

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

// Copies a rule and its whole action chain. Created disabled by default —
// you're about to end up with two rules that do the same thing on the same
// trigger, so it shouldn't start firing until you've actually changed
// something and reviewed it.
export async function duplicateAutomationRule(ruleId: string) {
  const rule = await prisma.automationRule.findUnique({
    where: { id: ruleId },
    include: { actions: { orderBy: { order: "asc" } } },
  });
  if (!rule) return;

  const copy = await prisma.automationRule.create({
    data: {
      name: `${rule.name} (copy)`,
      trigger: rule.trigger,
      enabled: false,
      actions: { create: rule.actions.map((a, order) => actionCreateData(a, order)) },
    },
  });

  revalidatePath("/automations");
  redirect(`/automations/${copy.id}`);
}

// Fires a rule's action chain right now with synthetic sample data, instead
// of waiting for a real event — see runRuleActionsNow for the safety
// behavior around not actually messaging a real contact.
export async function runAutomationRuleNow(ruleId: string): Promise<TestRunState> {
  try {
    const results = await runRuleActionsNow(ruleId);
    revalidatePath(`/automations/${ruleId}`);
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Test run failed" };
  }
}
