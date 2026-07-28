import { prisma } from "@/lib/prisma";
import {
  differenceInCalendarDays,
  differenceInHours,
  addDays,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns";

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

export async function getNextBestActions(limit = 8): Promise<NextBestAction[]> {
  const now = new Date();

  const [
    overdueFollowUps,
    unpaidInvoices,
    upcomingBookings,
    clientContacts,
    lastActivityByContact,
    onHoldProjects,
    dueTasks,
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
      include: { contact: { select: { id: true } } },
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
          { dueDate: { gte: startOfDay(now), lte: endOfDay(now) }, priority: "HIGH" },
        ],
      },
      include: { contact: true, project: true },
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
    const score = Math.max(40, 65 - hoursUntil / 2);
    return {
      id: `booking-${b.id}`,
      category: "Call",
      message: `Discovery call ${dayLabel} with ${b.name}.`,
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
    ...bookingActions,
    ...projectActions,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
