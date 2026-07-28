import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toggleTaskStatus } from "../tasks/actions";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart } from "@/components/ui/bar-chart";
import { ActivityTypeBadge, PriorityBadge } from "@/components/ui/badge";
import { getNextBestActions } from "./next-best-actions";
import { NextBestActionsPanel } from "./next-best-actions-panel";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(date);
}

const STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const QUICK_ACTIONS = [
  { label: "Add Lead", href: "/contacts/new?status=LEAD" },
  { label: "Add Client", href: "/contacts/new?status=CLIENT" },
  { label: "Create Proposal", href: "/deals/new?stage=PROPOSAL" },
  { label: "Start Audit", href: "/deals/new?title=Growth+Audit" },
  { label: "Create Invoice", href: "/deals?stage=WON" },
  { label: "Schedule Meeting", href: "/book" },
];

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    newLeadsToday,
    followUpsDue,
    callsScheduledToday,
    meetingsScheduledToday,
    openTaskCount,
    todaysTasks,
    recentActivities,
    upcomingMeetings,
    totalClients,
    allDeals,
    overdueTaskCount,
    projectsInProgress,
    activeProjects,
    nextBestActions,
  ] = await Promise.all([
    prisma.contact.count({
      where: { status: "LEAD", createdAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.task.count({
      where: { status: "OPEN", dueDate: { lte: endOfToday } },
    }),
    prisma.activity.count({
      where: { type: "CALL", occurredAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.booking.count({
      where: { startsAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.task.findMany({
      where: { status: "OPEN", dueDate: { lte: endOfToday } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { contact: true, deal: true, project: true },
    }),
    prisma.activity.findMany({
      orderBy: { occurredAt: "desc" },
      take: 5,
      include: { contact: true, deal: true },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { contact: true },
    }),
    prisma.contact.count({ where: { status: "CLIENT" } }),
    prisma.deal.findMany({
      select: { stage: true, value: true, isRecurring: true, wonAt: true },
    }),
    prisma.task.count({
      where: { status: "OPEN", dueDate: { lt: startOfToday } },
    }),
    prisma.project.count({ where: { status: "IN_PROGRESS" } }),
    prisma.project.count({ where: { status: { not: "COMPLETED" } } }),
    getNextBestActions(),
  ]);

  const wonDeals = allDeals.filter((d) => d.stage === "WON");
  const closedDeals = allDeals.filter((d) => d.stage === "WON" || d.stage === "LOST");
  const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : null;
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0) / wonDeals.length
      : null;

  const mrr = wonDeals
    .filter((d) => d.isRecurring)
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
  const oneTimeRevenue = wonDeals
    .filter((d) => !d.isRecurring && d.wonAt && d.wonAt >= startOfMonth)
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
  const revenueThisMonth = mrr + oneTimeRevenue;

  const stageData = STAGES.map((s) => ({
    label: s.label,
    value: allDeals.filter((d) => d.stage === s.value).length,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome back, {user.name.split(" ")[0]}. Here&apos;s how things stand today.
          </p>
        </div>
        {overdueTaskCount > 0 && (
          <Link
            href="/tasks"
            className="animate-fade-in flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {overdueTaskCount} overdue {overdueTaskCount === 1 ? "task" : "tasks"}
          </Link>
        )}
      </div>

      <NextBestActionsPanel actions={nextBestActions} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-center text-sm font-medium text-zinc-200 transition-colors hover:border-indigo-500/40 hover:bg-zinc-900 hover:text-indigo-300"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Today&apos;s metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="New leads" value={String(newLeadsToday)} />
          <StatCard label="Follow-ups due" value={String(followUpsDue)} />
          <StatCard label="Calls scheduled" value={String(callsScheduledToday)} />
          <StatCard label="Meetings scheduled" value={String(meetingsScheduledToday)} />
          <StatCard label="Open tasks" value={String(openTaskCount)} />
          <StatCard label="Projects in progress" value={String(projectsInProgress)} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">Business metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Monthly recurring revenue" value={formatCurrency(mrr)} />
          <StatCard label="One-time revenue" value={formatCurrency(oneTimeRevenue)} sub="This month" />
          <StatCard label="Revenue this month" value={formatCurrency(revenueThisMonth)} />
          <StatCard label="Total clients" value={String(totalClients)} />
          <StatCard label="Active projects" value={String(activeProjects)} />
          <StatCard
            label="Close rate"
            value={closeRate === null ? "—" : `${closeRate}%`}
            sub={closedDeals.length > 0 ? `${wonDeals.length} of ${closedDeals.length} closed` : "No closed deals yet"}
          />
          <StatCard
            label="Average deal size"
            value={avgDealSize === null ? "—" : formatCurrency(avgDealSize)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Pipeline by stage
            </h2>
            <Link
              href="/deals"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              View pipeline →
            </Link>
          </div>
          {allDeals.length === 0 ? (
            <p className="text-sm text-zinc-500">No deals yet.</p>
          ) : (
            <BarChart data={stageData} />
          )}
        </div>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Upcoming meetings
              {upcomingMeetings.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {upcomingMeetings.length}
                </span>
              )}
            </h2>
            <Link
              href="/booking"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              Manage →
            </Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing booked yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {upcomingMeetings.map((meeting) => (
                <li key={meeting.id} className="py-2.5 text-sm">
                  <p className="font-medium text-zinc-200">
                    {formatDateTime(meeting.startsAt, user.bookingTimezone)}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {meeting.contact ? (
                      <Link
                        href={`/contacts/${meeting.contact.id}`}
                        className="hover:text-indigo-400"
                      >
                        {meeting.name}
                      </Link>
                    ) : (
                      meeting.name
                    )}{" "}
                    · {meeting.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Recent activity
            </h2>
            <Link
              href="/contacts"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              View contacts →
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">{activity.summary}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {activity.contact && `${activity.contact.firstName} ${activity.contact.lastName}`}
                      {activity.deal && ` · ${activity.deal.title}`}
                      {" · "}
                      {formatDate(activity.occurredAt)}
                    </p>
                  </div>
                  <ActivityTypeBadge type={activity.type} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Today&apos;s tasks
              {todaysTasks.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {todaysTasks.length}
                </span>
              )}
            </h2>
            <Link
              href="/tasks"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
            >
              View all →
            </Link>
          </div>
          {todaysTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing due today. Nice.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {todaysTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                  <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                    <button
                      type="submit"
                      className="h-4 w-4 shrink-0 rounded border border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
                      aria-label="Complete task"
                    />
                  </form>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="truncate font-medium text-zinc-200 hover:text-indigo-400"
                      >
                        {task.title}
                      </Link>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {task.dueDate && task.dueDate < startOfToday
                        ? `Overdue since ${formatDate(task.dueDate)}`
                        : "Due today"}
                      {task.contact && ` · ${task.contact.firstName} ${task.contact.lastName}`}
                      {task.deal && ` · ${task.deal.title}`}
                      {task.project && ` · ${task.project.name}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
