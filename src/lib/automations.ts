import "server-only";
import { prisma } from "@/lib/prisma";
import { sendAutomationEmail, isMailConfigured } from "@/lib/mail";
import type { AutomationTrigger } from "@prisma/client";

type TriggerContext = {
  contactId?: string;
  summary: string;
  payload?: Record<string, unknown>;
  // Extra {{token}} substitutions available to a SEND_EMAIL action's
  // subject/body when it's sent to the contact — e.g. {{date}} for an
  // appointment time. {{name}} and {{email}} are always filled in from the
  // contact record itself, so callers only need to pass event-specific
  // extras here.
  variables?: Record<string, string>;
};

function substituteTokens(text: string, tokens: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => tokens[key] ?? match);
}

export async function fireAutomationTrigger(
  trigger: AutomationTrigger,
  context: TriggerContext
) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger, enabled: true },
    });
    if (rules.length === 0) return;

    const owner = await prisma.user.findFirst();

    for (const rule of rules) {
      try {
        if (rule.actionType === "CREATE_TASK") {
          await prisma.task.create({
            data: {
              title: rule.taskTitle?.trim() || context.summary,
              dueDate: new Date(
                Date.now() + (rule.taskDueInDays ?? 1) * 24 * 60 * 60 * 1000
              ),
              notes: `Auto-created by automation "${rule.name}".`,
              contactId: context.contactId ?? null,
              assignedToId: owner?.id ?? null,
            },
          });
        } else if (rule.actionType === "SEND_EMAIL") {
          if (!isMailConfigured()) {
            // Without GMAIL_USER/GMAIL_APP_PASSWORD set, mail.ts silently
            // logs instead of sending (useful for local dev, dangerous here
            // — an automation that quietly never emails anyone should never
            // read as "Success"). Fail loudly so it shows up in Recent runs.
            throw new Error(
              "Email not sent — GMAIL_USER/GMAIL_APP_PASSWORD aren't configured"
            );
          }
          if (rule.emailRecipient === "CONTACT") {
            const contact = context.contactId
              ? await prisma.contact.findUnique({ where: { id: context.contactId } })
              : null;
            if (!contact?.email) {
              throw new Error("No contact email address to send to");
            }
            const tokens: Record<string, string> = {
              name: contact.firstName || contact.businessName || contact.lastName || "there",
              email: contact.email,
              ...context.variables,
            };
            const subject = substituteTokens(
              rule.emailSubject?.trim() || `A message from ${owner?.name ?? "us"}`,
              tokens
            );
            const body = substituteTokens(rule.emailBody?.trim() || context.summary, tokens);
            await sendAutomationEmail(contact.email, subject, body);
          } else if (owner) {
            const subject = rule.emailSubject?.trim() || `Automation: ${rule.name}`;
            const body = rule.emailBody?.trim()
              ? `${rule.emailBody.trim()}\n\n${context.summary}`
              : context.summary;
            await sendAutomationEmail(owner.email, subject, body);
          }
        } else if (rule.actionType === "WEBHOOK") {
          if (rule.webhookUrl) {
            await fetch(rule.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trigger,
                rule: rule.name,
                summary: context.summary,
                contactId: context.contactId ?? null,
                timestamp: new Date().toISOString(),
                ...context.payload,
              }),
            });
          }
        }

        await prisma.automationRun.create({
          data: { ruleId: rule.id, status: "SUCCESS", summary: context.summary },
        });
      } catch (err) {
        await prisma.automationRun.create({
          data: {
            ruleId: rule.id,
            status: "FAILED",
            summary: context.summary,
            error: err instanceof Error ? err.message : "Unknown error",
          },
        });
      }
    }
  } catch (err) {
    console.error("[automations] failed to fire trigger", trigger, err);
  }
}

export async function checkOverdueTasks() {
  const overdue = await prisma.task.findMany({
    where: { status: "OPEN", dueDate: { lt: new Date() }, overdueNotified: false },
    take: 20,
  });

  for (const task of overdue) {
    await fireAutomationTrigger("TASK_OVERDUE", {
      contactId: task.contactId ?? undefined,
      summary: task.title,
    });
    await prisma.task.update({
      where: { id: task.id },
      data: { overdueNotified: true },
    });
  }
}
