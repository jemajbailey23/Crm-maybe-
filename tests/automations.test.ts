import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Automations polish: a rule can now chain multiple actions instead of one,
// and there's a manual "Test this automation" path. Both go through
// real outbound side effects (email, webhook) which are mocked here the
// same way tests/mail.test.ts and tests/booking-engine.test.ts do —
// nodemailer's sendMail and global fetch are the only things faked;
// everything else (Prisma, the actual engine logic) is real.
type SentMail = { to?: string; subject?: string; text?: string; html?: string; [key: string]: unknown };
const sendMail = vi.fn<(opts: SentMail) => Promise<Record<string, never>>>(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
process.env.GMAIL_USER = "test@example.com";
process.env.GMAIL_APP_PASSWORD = "fake-app-password";

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
  async () => new Response(null, { status: 200 })
);
vi.stubGlobal("fetch", fetchMock);

// PUSH_NOTIFICATION actions go through lib/push.ts's sendPushToUser, which
// calls out via the web-push library — same mocking approach as
// tests/push.test.ts.
const sendNotification = vi.fn<
  (subscription: { endpoint: string }, payload?: string) => Promise<{ statusCode: number }>
>(async () => ({ statusCode: 201 }));
vi.mock("web-push", () => ({
  default: {
    sendNotification: (...args: Parameters<typeof sendNotification>) => sendNotification(...args),
    setVapidDetails: () => {},
    WebPushError: class extends Error {},
  },
}));
process.env.VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";
process.env.VAPID_SUBJECT = "mailto:test@example.com";

// duplicateAutomationRule calls revalidatePath, which throws outside a real
// Next.js request context — same fix as tests/contacts-import.test.ts.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { fireAutomationTrigger, runRuleActionsNow } = await import("@/lib/automations");
const { duplicateAutomationRule } = await import("@/app/(app)/automations/actions");

async function callIgnoringRedirect(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    const digest = (err as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return;
    throw err;
  }
}

const RUN_ID = `test${Date.now()}${Math.floor(Math.random() * 10000)}`;
const createdContactIds: string[] = [];
const createdRuleIds: string[] = [];
const createdTaskIds: string[] = [];

async function makeContact(overrides: Partial<Parameters<typeof prisma.contact.create>[0]["data"]> = {}) {
  const contact = await prisma.contact.create({
    data: {
      firstName: "Ada",
      lastName: `Test-${RUN_ID}`,
      email: `automation-${RUN_ID}-${createdContactIds.length}@example.com`,
      ...overrides,
    },
  });
  createdContactIds.push(contact.id);
  return contact;
}

beforeEach(() => {
  sendMail.mockClear();
  fetchMock.mockClear();
  sendNotification.mockClear();
});

afterAll(async () => {
  await prisma.automationRun.deleteMany({ where: { ruleId: { in: createdRuleIds } } });
  await prisma.automationRule.deleteMany({ where: { id: { in: createdRuleIds } } });
  await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { contains: RUN_ID } } });
});

describe("fireAutomationTrigger — multi-action rules", () => {
  it("runs every action in order and records one run per action", async () => {
    const contact = await makeContact();
    const rule = await prisma.automationRule.create({
      data: {
        name: `Multi-action ${RUN_ID}`,
        trigger: "LEAD_CREATED",
        actions: {
          create: [
            { order: 0, actionType: "CREATE_TASK", taskTitle: "Call {{name}}", taskDueInDays: 2 },
            {
              order: 1,
              actionType: "SEND_EMAIL",
              emailRecipient: "OWNER",
              emailSubject: "New lead: {{name}}",
              emailBody: "{{name}} ({{email}}) just came in.",
            },
          ],
        },
      },
      include: { actions: { orderBy: { order: "asc" } } },
    });
    createdRuleIds.push(rule.id);

    await fireAutomationTrigger("LEAD_CREATED", { contactId: contact.id, summary: "New lead" });

    // Bugfix: task titles now get {{token}} substitution, same as emails.
    const task = await prisma.task.findFirst({
      where: { contactId: contact.id, title: { startsWith: "Call " } },
      orderBy: { createdAt: "desc" },
    });
    expect(task?.title).toBe(`Call ${contact.firstName}`);
    if (task) createdTaskIds.push(task.id);

    // Bugfix: OWNER-recipient emails now get token substitution too.
    expect(sendMail).toHaveBeenCalledTimes(1);
    const [call] = sendMail.mock.calls;
    expect(call[0].subject).toBe(`New lead: ${contact.firstName}`);
    expect(call[0].text).toContain(contact.firstName);
    expect(call[0].text).toContain(contact.email);

    const runs = await prisma.automationRun.findMany({
      where: { ruleId: rule.id },
      orderBy: { createdAt: "asc" },
    });
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.status === "SUCCESS")).toBe(true);
    // Each run is linked to the specific action that produced it, not just
    // the rule — that's what makes per-step run history possible.
    expect(runs.map((r) => r.actionId).sort()).toEqual(
      rule.actions.map((a) => a.id).sort()
    );
  });

  it("keeps running remaining actions when one action fails", async () => {
    // No email linked contact → the SEND_EMAIL/CONTACT action fails, but the
    // CREATE_TASK action (which doesn't need a contact email) still runs.
    const rule = await prisma.automationRule.create({
      data: {
        name: `Partial failure ${RUN_ID}`,
        trigger: "MISSED_CALL",
        actions: {
          create: [
            { order: 0, actionType: "SEND_EMAIL", emailRecipient: "CONTACT", emailSubject: "Hi", emailBody: "Hi" },
            { order: 1, actionType: "CREATE_TASK", taskTitle: `Follow up ${RUN_ID}`, taskDueInDays: 0 },
          ],
        },
      },
    });
    createdRuleIds.push(rule.id);

    await fireAutomationTrigger("MISSED_CALL", { summary: "Missed call, no contact linked" });

    const task = await prisma.task.findFirst({ where: { title: `Follow up ${RUN_ID}` } });
    expect(task).toBeTruthy();
    if (task) createdTaskIds.push(task.id);

    const runs = await prisma.automationRun.findMany({ where: { ruleId: rule.id } });
    expect(runs).toHaveLength(2);
    expect(runs.filter((r) => r.status === "FAILED")).toHaveLength(1);
    expect(runs.filter((r) => r.status === "SUCCESS")).toHaveLength(1);
  });
});

describe("fireAutomationTrigger — PUSH_NOTIFICATION action", () => {
  it("substitutes tokens in the title/body and sends to the owner's registered devices", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id, endpoint: { contains: RUN_ID } } });
    const sub = await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${RUN_ID}-lead`,
        p256dh: "test-p256dh",
        auth: "test-auth",
        userId: owner.id,
      },
    });

    const contact = await makeContact();
    const rule = await prisma.automationRule.create({
      data: {
        name: `Push on lead ${RUN_ID}`,
        trigger: "LEAD_CREATED",
        actions: {
          create: [
            { order: 0, actionType: "PUSH_NOTIFICATION", pushTitle: "New lead", pushBody: "{{name}} just came in." },
          ],
        },
      },
    });
    createdRuleIds.push(rule.id);

    await fireAutomationTrigger("LEAD_CREATED", { contactId: contact.id, summary: "New lead" });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [, payload] = sendNotification.mock.calls[0];
    const body = JSON.parse(payload as string);
    expect(body.title).toBe("New lead");
    expect(body.body).toBe(`${contact.firstName} just came in.`);

    const runs = await prisma.automationRun.findMany({ where: { ruleId: rule.id } });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("SUCCESS");

    await prisma.pushSubscription.delete({ where: { id: sub.id } });
  });

  it("fails loudly (and is logged as a failed run) when no devices are registered", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id } });

    const rule = await prisma.automationRule.create({
      data: {
        name: `Push no devices ${RUN_ID}`,
        trigger: "INVOICE_PAID",
        actions: { create: [{ order: 0, actionType: "PUSH_NOTIFICATION", pushTitle: "Invoice paid" }] },
      },
    });
    createdRuleIds.push(rule.id);

    await fireAutomationTrigger("INVOICE_PAID", { summary: "Invoice paid" });

    const runs = await prisma.automationRun.findMany({ where: { ruleId: rule.id } });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("FAILED");
    expect(runs[0].error).toMatch(/No devices registered/);
  });
});

describe("runRuleActionsNow — manual test run", () => {
  it("redirects a CONTACT-recipient test email to the owner instead of the real contact", async () => {
    const contact = await makeContact({ email: `should-not-receive-${RUN_ID}@example.com` });
    const owner = await prisma.user.findFirst();
    const rule = await prisma.automationRule.create({
      data: {
        name: `Test-run contact email ${RUN_ID}`,
        trigger: "CLIENT_SIGNED",
        actions: {
          create: [
            { order: 0, actionType: "SEND_EMAIL", emailRecipient: "CONTACT", emailSubject: "Welcome", emailBody: "Hi {{name}}" },
          ],
        },
      },
    });
    createdRuleIds.push(rule.id);

    // Use this specific contact as the "most recent" sample by making sure
    // it really is the most recently created one.
    void contact;

    const results = await runRuleActionsNow(rule.id);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [call] = sendMail.mock.calls;
    expect(call[0].to).toBe(owner?.email);
    expect(call[0].to).not.toBe(contact.email);
    expect(call[0].subject).toContain(contact.email);

    const runs = await prisma.automationRun.findMany({ where: { ruleId: rule.id } });
    expect(runs).toHaveLength(1);
    expect(runs[0].isTest).toBe(true);
  });

  it("prefixes a test-run task title with [Test]", async () => {
    await makeContact();
    const rule = await prisma.automationRule.create({
      data: {
        name: `Test-run task ${RUN_ID}`,
        trigger: "TASK_OVERDUE",
        actions: { create: [{ order: 0, actionType: "CREATE_TASK", taskTitle: `Sample ${RUN_ID}`, taskDueInDays: 1 }] },
      },
    });
    createdRuleIds.push(rule.id);

    const results = await runRuleActionsNow(rule.id);
    expect(results[0].ok).toBe(true);

    const task = await prisma.task.findFirst({ where: { title: `[Test] Sample ${RUN_ID}` } });
    expect(task).toBeTruthy();
    if (task) createdTaskIds.push(task.id);
  });

  it("tags a test-run webhook payload with test: true", async () => {
    const rule = await prisma.automationRule.create({
      data: {
        name: `Test-run webhook ${RUN_ID}`,
        trigger: "WEBSITE_PUBLISHED",
        actions: { create: [{ order: 0, actionType: "WEBHOOK", webhookUrl: "https://example.com/hook" }] },
      },
    });
    createdRuleIds.push(rule.id);

    const results = await runRuleActionsNow(rule.id);
    expect(results[0].ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.test).toBe(true);
  });

  it("prefixes a test-run push notification title with [Test]", async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.pushSubscription.deleteMany({ where: { userId: owner.id, endpoint: { contains: RUN_ID } } });
    const sub = await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${RUN_ID}-testrun`,
        p256dh: "test-p256dh",
        auth: "test-auth",
        userId: owner.id,
      },
    });

    const rule = await prisma.automationRule.create({
      data: {
        name: `Test-run push ${RUN_ID}`,
        trigger: "APPOINTMENT_NO_SHOW",
        actions: { create: [{ order: 0, actionType: "PUSH_NOTIFICATION", pushTitle: "Sample alert" }] },
      },
    });
    createdRuleIds.push(rule.id);

    const results = await runRuleActionsNow(rule.id);
    expect(results[0].ok).toBe(true);

    const [, payload] = sendNotification.mock.calls[0];
    const body = JSON.parse(payload as string);
    expect(body.title).toBe("[Test] Sample alert");

    const runs = await prisma.automationRun.findMany({ where: { ruleId: rule.id } });
    expect(runs[0].isTest).toBe(true);

    await prisma.pushSubscription.delete({ where: { id: sub.id } });
  });
});

describe("duplicateAutomationRule", () => {
  it("copies a rule's whole action chain, disabled by default", async () => {
    const rule = await prisma.automationRule.create({
      data: {
        name: `Original ${RUN_ID}`,
        trigger: "REVIEW_REQUEST",
        enabled: true,
        actions: {
          create: [
            { order: 0, actionType: "CREATE_TASK", taskTitle: "Step one", taskDueInDays: 1 },
            { order: 1, actionType: "SEND_EMAIL", emailRecipient: "OWNER", emailSubject: "Step two" },
          ],
        },
      },
    });
    createdRuleIds.push(rule.id);

    await callIgnoringRedirect(() => duplicateAutomationRule(rule.id));

    const copy = await prisma.automationRule.findFirst({
      where: { name: `Original ${RUN_ID} (copy)` },
      include: { actions: { orderBy: { order: "asc" } } },
    });
    expect(copy).toBeTruthy();
    if (copy) createdRuleIds.push(copy.id);
    expect(copy?.enabled).toBe(false);
    expect(copy?.actions).toHaveLength(2);
    expect(copy?.actions.map((a) => a.actionType)).toEqual(["CREATE_TASK", "SEND_EMAIL"]);
    expect(copy?.actions[1].emailSubject).toBe("Step two");
  });
});
