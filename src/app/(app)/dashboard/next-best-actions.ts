import { prisma } from "@/lib/prisma";
import {
  differenceInCalendarDays,
  differenceInHours,
  addDays,
  subDays,
  isToday,
} from "date-fns";
import { startOfDayInZone, endOfDayInZone } from "@/lib/timezone";

export type NextBestActionSeverity = "urgent" | "high" | "medium";

export type NextBestAction = {
  id: string;
  category: string;
  message: string;
  href: string;
  severity: NextBestActionSeverity;
  score: number;
};

const CONTACT_ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "SMS",
  "FACEBOOK_MESSAGE",
  "DEMO",
  "PROPOSAL",
] as const;

const STALE_CLIENT_DAYS = 10;
const STALE_DEAL_DAYS = 10;
const AUTOMATION_FAILURE_WINDOW_DAYS = 3;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function contactName(c: { firstName: string; lastName: string; businessName: string | null }) {
  return c.businessName || `${c.firstName} ${c.lastName}`;
}

function severityFor(score: number): NextBestActionSeverity {
  if (score >= 100) return "urgent";
  if (score >= 60) return "high";
  return "medium";
}

export async function getNextBestActions(
  timezone: string,
  limit = 8
): Promise<NextBestAction[]> {
  const now = new Date();
  const startOfToday = startOfDayInZone(now, timezone);
  const endOfToday = endOfDayInZone(now, timezone);

  const [
    overdueFollowUps,
    unpaidInvoices,
    upcomingBookings,
    clientContacts,
    lastActivityByContact,
    onHoldProjects,
    dueTasks,
    openDealsForStaleness,
    lastActivityByDeal,
    failedAutomationRuns,
  ] = await Promise.all([
    prisma.contact.findMany({
      where: { nextFollowUpAt: { lt: now } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        nextFollowUpAt: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [{ status: "OVERDUE" }, { status: "SENT", dueDate: { lt: now } }],
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, businessName: true },
        },
      },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: now, lte: addDays(now, 1) } },
      select: { id: true, startsAt: true, name: true, notes: true, contact: { select: { id: true } } },
    }),
    prisma.contact.findMany({
      where: { status: "CLIENT" },
      select: { id: true, firstName: true, lastName: true, businessName: true, createdAt: true },
    }),
    prisma.activity.groupBy({
      by: ["contactId"],
      where: { contactId: { not: null }, type: { in: [...CONTACT_ACTIVITY_TYPES] } },
      _max: { occurredAt: true },
    }),
    prisma.project.findMany({
      where: { status: "ON_HOLD" },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, businessName: true },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        status: "OPEN",
        OR: [
          { dueDate: { lt: now } },
          { dueDate: { gte: startOfToday, lte: endOfToday }, priority: "HIGH" },
        ],
      },
      include: { contact: true, project: true },
    }),
    prisma.deal.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      select: {
        id: true,
        title: true,
        createdAt: true,
        contact: { select: { firstName: true, lastName: true, businessName: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.activity.groupBy({
      by: ["dealId"],
      where: { dealId: { not: null } },
      _max: { occurredAt: true },
    }),
    prisma.automationRun.findMany({
      where: { status: "FAILED", createdAt: { gte: subDays(now, AUTOMATION_FAILURE_WINDOW_DAYS) } },
      include: { rule: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const followUpActions: NextBestAction[] = overdueFollowUps.map((c) => {
    const daysOverdue = Math.max(0, differenceInCalendarDays(now, c.nextFollowUpAt!));
    const score = 50 + daysOverdue * 10;
    return {
      id: `followup-${c.id}`,
      category: "Follow-up",
      message: `Follow up with ${contactName(c)}.`,
      href: `/contacts/${c.id}`,
      severity: severityFor(score),
      score,
    };
  });

  const invoiceActions: NextBestAction[] = unpaidInvoices.map((inv) => {
    const daysOverdue = inv.dueDate ? Math.max(0, differenceInCalendarDays(now, inv.dueDate)) : 0;
    const score = 80 + daysOverdue * 15;
    return {
      id: `invoice-${inv.id}`,
      category: "Invoice",
      message: `Invoice overdue: ${contactName(inv.contact)} — ${formatCurrency(inv.amount)}.`,
      href: `/contacts/${inv.contact.id}?tab=billing`,
      severity: severityFor(score),
      score,
    };
  });

  const bookingActions: NextBestAction[] = upcomingBookings.map((b) => {
    const hoursUntil = Math.max(0, differenceInHours(b.startsAt, now));
    const dayLabel = isToday(b.startsAt) ? "today" : "tomorrow";
    const hasNoNotes = !b.notes?.trim();
    const score = Math.max(40, 65 - hoursUntil / 2) + (hasNoNotes && hoursUntil <= 24 ? 20 : 0);
    return {
      id: `booking-${b.id}`,
      category: hasNoNotes ? "Meeting prep" : "Call",
      message: hasNoNotes
        ? `Discovery call ${dayLabel} with ${b.name} has no prep notes yet.`
        : `Discovery call ${dayLabel} with ${b.name}.`,
      href: b.contact ? `/contacts/${b.contact.id}` : "/booking",
      severity: severityFor(score),
      score,
    };
  });

  const lastActivityMap = new Map(
    lastActivityByContact
      .filter((r) => r.contactId)
      .map((r) => [r.contactId as string, r._max.occurredAt])
  );
  const staleActions: NextBestAction[] = clientContacts
    .map((c) => {
      const last = lastActivityMap.get(c.id) ?? c.createdAt;
      const daysSince = differenceInCalendarDays(now, last);
      return { c, daysSince };
    })
    .filter(({ daysSince }) => daysSince >= STALE_CLIENT_DAYS)
    .map(({ c, daysSince }) => {
      const score = 40 + daysSince * 5;
      return {
        id: `stale-${c.id}`,
        category: "Client contact",
        message: `${contactName(c)} has not been contacted in ${daysSince} days.`,
        href: `/contacts/${c.id}`,
        severity: severityFor(score),
        score,
      };
    });

  const projectActions: NextBestAction[] = onHoldProjects.map((p) => {
    const score = 30;
    return {
      id: `project-${p.id}`,
      category: "Project",
      message: `${p.name} for ${contactName(p.contact)} is on hold.`,
      href: `/projects/${p.id}`,
      severity: severityFor(score),
      score,
    };
  });

  const lastActivityByDealMap = new Map(
    lastActivityByDeal
      .filter((r) => r.dealId)
      .map((r) => [r.dealId as string, r._max.occurredAt])
  );
  const dealStaleActions: NextBestAction[] = openDealsForStaleness
    .map((d) => {
      const last = lastActivityByDealMap.get(d.id) ?? d.createdAt;
      const daysSince = differenceInCalendarDays(now, last);
      return { d, daysSince };
    })
    .filter(({ daysSince }) => daysSince >= STALE_DEAL_DAYS)
    .map(({ d, daysSince }) => {
      const score = 45 + daysSince * 5;
      const who = d.contact ? contactName(d.contact) : d.company?.name;
      return {
        id: `deal-stale-${d.id}`,
        category: "Deal",
        message: `${d.title}${who ? ` (${who})` : ""} has had no activity in ${daysSince} days.`,
        href: `/deals/${d.id}`,
        severity: severityFor(score),
        score,
      };
    });

  const automationFailedActions: NextBestAction[] = failedAutomationRuns.map((run) => {
    const score = 65;
    return {
      id: `automation-failed-${run.id}`,
      category: "Automation",
      message: `Automation "${run.rule.name}" failed: ${run.error ?? "unknown error"}.`,
      href: "/automations",
      severity: severityFor(score),
      score,
    };
  });

  const taskActions: NextBestAction[] = dueTasks.map((t) => {
    const overdue = !!t.dueDate && t.dueDate < now;
    const daysOverdue = overdue ? Math.max(0, differenceInCalendarDays(now, t.dueDate!)) : 0;
    const score = overdue
      ? 70 + daysOverdue * 12 + (t.priority === "HIGH" ? 15 : 0)
      : 55;
    const who = t.contact ? contactName(t.contact) : t.project?.name;
    return {
      id: `task-${t.id}`,
      category: "Task",
      message: `${t.title} is ${overdue ? "overdue" : "due today"}${who ? ` — ${who}` : ""}.`,
      href: `/tasks/${t.id}`,
      severity: severityFor(score),
      score,
    };
  });

  return [
    ...invoiceActions,
    ...followUpActions,
    ...taskActions,
    ...staleActions,
    ...dealStaleActions,
    ...automationFailedActions,
    ...bookingActions,
    ...projectActions,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
