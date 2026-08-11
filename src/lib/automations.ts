import "server-only";
import { prisma } from "@/lib/prisma";
import { sendAutomationEmail, isMailConfigured } from "@/lib/mail";
import type { AutomationTrigger, AutomationAction, Contact, User } from "@prisma/client";

type TriggerContext = {
  contactId?: string;
  summary: string;
  payload?: Record<string, unknown>;
  // Extra {{token}} substitutions available to a SEND_EMAIL action's
  // subject/body — e.g. {{date}} for an appointment time. {{name}} and
  // {{email}} are filled in from the contact record itself when one is
  // linked, so callers only need to pass event-specific extras here.
  variables?: Record<string, string>;
};

type RunOneActionOptions = {
  // Manual "Test this automation" runs, as opposed to a real trigger firing.
  isTest?: boolean;
  // Safety valve for test runs: never actually message a real contact — a
  // CONTACT-recipient email is redirected to the owner instead, clearly
  // labeled with who it would have gone to.
  redirectContactEmailToOwner?: boolean;
};

function substituteTokens(text: string, tokens: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => tokens[key] ?? match);
}

function contactTokens(contact: Contact | null, extra?: Record<string, string>): Record<string, string> {
  return {
    ...(contact
      ? {
          name: contact.firstName || contact.businessName || contact.lastName || "there",
          email: contact.email ?? "",
        }
      : {}),
    ...extra,
  };
}

/** Executes exactly one AutomationAction. Throws on failure — callers are
 * responsible for turning that into an AutomationRun row, since "what run
 * this belongs to" differs between a real trigger firing and a manual test. */
async function runOneAction(
  action: AutomationAction,
  ruleName: string,
  context: TriggerContext,
  owner: User | null,
  contact: Contact | null,
  opts: RunOneActionOptions = {}
) {
  if (action.actionType === "CREATE_TASK") {
    // Same {{name}}/{{email}}/etc. substitution as the email actions get —
    // a task title is just as often written as "Call {{name}}" as an email
    // subject is.
    const tokens = contactTokens(contact, context.variables);
    const title =
      (opts.isTest ? "[Test] " : "") + substituteTokens(action.taskTitle?.trim() || context.summary, tokens);
    await prisma.task.create({
      data: {
        title,
        dueDate: new Date(Date.now() + (action.taskDueInDays ?? 1) * 24 * 60 * 60 * 1000),
        description: `Auto-created by automation "${ruleName}".`,
        contactId: context.contactId ?? null,
        assignedToId: owner?.id ?? null,
      },
    });
  } else if (action.actionType === "SEND_EMAIL") {
    if (!isMailConfigured()) {
      // Without GMAIL_USER/GMAIL_APP_PASSWORD set, mail.ts silently logs
      // instead of sending (useful for local dev, dangerous here — an
      // automation that quietly never emails anyone should never read as
      // "Success"). Fail loudly so it shows up in Recent runs.
      throw new Error("Email not sent — GMAIL_USER/GMAIL_APP_PASSWORD aren't configured");
    }
    if (action.emailRecipient === "CONTACT") {
      if (!contact?.email) {
        throw new Error("No contact email address to send to");
      }
      const tokens = contactTokens(contact, context.variables);
      const subject = substituteTokens(
        action.emailSubject?.trim() || `A message from ${owner?.name ?? "us"}`,
        tokens
      );
      const body = substituteTokens(action.emailBody?.trim() || context.summary, tokens);
      if (opts.redirectContactEmailToOwner && owner) {
        await sendAutomationEmail(
          owner.email,
          `[Test — would send to ${contact.email}] ${subject}`,
          body,
          owner.name
        );
      } else {
        await sendAutomationEmail(contact.email, subject, body, owner?.name);
      }
    } else if (owner) {
      // Bugfix: the owner-recipient path used to skip token substitution
      // entirely, so {{name}}/{{email}}/etc. in an OWNER email's subject or
      // body went out literally instead of being filled in — inconsistent
      // with the CONTACT-recipient path right above. Uses the same
      // contact-derived tokens when one is linked to the triggering event.
      const tokens = contactTokens(contact, context.variables);
      const subject = substituteTokens(action.emailSubject?.trim() || `Automation: ${ruleName}`, tokens);
      const bodyRaw = action.emailBody?.trim()
        ? `${action.emailBody.trim()}\n\n${context.summary}`
        : context.summary;
      const body = substituteTokens(bodyRaw, tokens);
      await sendAutomationEmail(owner.email, subject, body);
    }
  } else if (action.actionType === "WEBHOOK") {
    if (!action.webhookUrl) {
      throw new Error("No webhook URL configured");
    }
    await fetch(action.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule: ruleName,
        summary: context.summary,
        contactId: context.contactId ?? null,
        timestamp: new Date().toISOString(),
        ...(opts.isTest ? { test: true } : {}),
        ...context.payload,
      }),
    });
  }
}

export async function fireAutomationTrigger(trigger: AutomationTrigger, context: TriggerContext) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger, enabled: true },
      include: { actions: { orderBy: { order: "asc" } } },
    });
    if (rules.length === 0) return;

    const owner = await prisma.user.findFirst();
    const contact = context.contactId
      ? await prisma.contact.findUnique({ where: { id: context.contactId } })
      : null;

    for (const rule of rules) {
      // Each action runs (and is logged) independently — one action failing
      // (e.g. no contact email on file) shouldn't stop the rule's other
      // actions from running.
      for (const action of rule.actions) {
        try {
          await runOneAction(action, rule.name, context, owner, contact);
          await prisma.automationRun.create({
            data: { ruleId: rule.id, actionId: action.id, status: "SUCCESS", summary: context.summary },
          });
        } catch (err) {
          await prisma.automationRun.create({
            data: {
              ruleId: rule.id,
              actionId: action.id,
              status: "FAILED",
              summary: context.summary,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          });
        }
      }
    }
  } catch (err) {
    console.error("[automations] failed to fire trigger", trigger, err);
  }
}

export type TestRunActionResult = {
  actionId: string;
  actionType: string;
  ok: boolean;
  error?: string;
};

/** Manually fires one rule's action chain from the automation detail page's
 * "Test this automation" button, using synthetic/sample data instead of
 * waiting for a real event. Safe to run against a rule with real,
 * client-facing actions — see redirectContactEmailToOwner above. */
export async function runRuleActionsNow(ruleId: string): Promise<TestRunActionResult[]> {
  const rule = await prisma.automationRule.findUnique({
    where: { id: ruleId },
    include: { actions: { orderBy: { order: "asc" } } },
  });
  if (!rule) throw new Error("Automation not found");
  if (rule.actions.length === 0) throw new Error("This automation has no actions to run yet");

  const owner = await prisma.user.findFirst();
  // Most-recently-created contact stands in as realistic sample data for
  // token substitution — falls back to no contact (tokens render literally,
  // CONTACT-recipient emails fail loudly) if none exist yet.
  const sampleContact = await prisma.contact.findFirst({ orderBy: { createdAt: "desc" } });

  const context: TriggerContext = {
    contactId: sampleContact?.id,
    summary: `Test run of "${rule.name}"`,
    variables: {
      date: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    },
  };

  const results: TestRunActionResult[] = [];
  for (const action of rule.actions) {
    try {
      await runOneAction(action, rule.name, context, owner, sampleContact, {
        isTest: true,
        redirectContactEmailToOwner: true,
      });
      await prisma.automationRun.create({
        data: { ruleId: rule.id, actionId: action.id, status: "SUCCESS", summary: context.summary, isTest: true },
      });
      results.push({ actionId: action.id, actionType: action.actionType, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.automationRun.create({
        data: {
          ruleId: rule.id,
          actionId: action.id,
          status: "FAILED",
          summary: context.summary,
          error: message,
          isTest: true,
        },
      });
      results.push({ actionId: action.id, actionType: action.actionType, ok: false, error: message });
    }
  }
  return results;
}

export async function checkOverdueTasks() {
  const overdue = await prisma.task.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      dueDate: { lt: new Date() },
      overdueNotified: false,
    },
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
