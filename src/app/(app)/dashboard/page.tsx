import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { syncNextBestActions } from "../next-actions/sync";
import { getTopActiveNextActions } from "../next-actions/query";
import { NextBestActionsPanel } from "./next-best-actions-panel";
import { checkOverdueTasks } from "@/lib/automations";
import { sendDueBookingReminders } from "@/lib/booking-notify";
import { getStageLabels, stageOptions } from "@/lib/pipeline-stages";
import { startOfDayInZone, endOfDayInZone, startOfMonthInZone, endOfMonthInZone } from "@/lib/timezone";
import { getSalesPipelineStats } from "./sales-pipeline";
import { getRevenueSnapshot } from "./revenue-snapshot";
import { getDeliverySnapshot } from "./delivery-snapshot";
import { QuickActions } from "./quick-actions";
import { TodaysOverview } from "./todays-overview";
import { SalesPipelinePanel } from "./sales-pipeline-panel";
import { RevenueSnapshotPanel } from "./revenue-snapshot-panel";
import { DeliverySnapshotPanel } from "./delivery-snapshot-panel";
import { UpcomingMeetingsPanel } from "./upcoming-meetings-panel";
import { RecentActivityPanel } from "./recent-activity-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  await checkOverdueTasks();
  // No background scheduler exists in this app (see checkOverdueTasks
  // above for the same established pattern) — reminders are swept
  // opportunistically on every real dashboard visit instead.
  await sendDueBookingReminders();
  const STAGES = stageOptions(await getStageLabels());

  const now = new Date();
  const startOfToday = startOfDayInZone(now, user.bookingTimezone);
  const endOfToday = endOfDayInZone(now, user.bookingTimezone);
  const startOfMonth = startOfMonthInZone(now, user.bookingTimezone);
  const endOfMonth = endOfMonthInZone(now, user.bookingTimezone);

  // Reconcile persisted Next Best Action recommendations against live data
  // before reading them below — this has to happen before the query, not
  // inside the same Promise.all.
  await syncNextBestActions(now);

  const [
    newLeadsToday,
    followUpsDue,
    callsScheduledToday,
    meetingsScheduledToday,
    openTaskCount,
    todaysTasks,
    recentActivities,
    upcomingMeetings,
    allDeals,
    overdueTaskCount,
    projectsOnHold,
    nextBestActions,
    salesPipeline,
    revenueSnapshot,
    deliverySnapshot,
    blockedTaskCount,
    waitingTaskCount,
    reviewTaskCount,
  ] = await Promise.all([
    prisma.contact.count({
      where: { status: "LEAD", createdAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.task.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lte: endOfToday } },
    }),
    prisma.activity.count({
      where: { type: "CALL", occurredAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.booking.count({
      where: { status: "CONFIRMED", startsAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.task.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.task.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lte: endOfToday } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { contact: true, deal: true, project: true },
    }),
    prisma.activity.findMany({
      orderBy: { occurredAt: "desc" },
      take: 5,
      include: {
        contact: { include: { company: true } },
        deal: { include: { company: true } },
        project: true,
      },
    }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { contact: true },
    }),
    prisma.deal.findMany({
      select: { stage: true, oneTimeValue: true, mrrValue: true },
    }),
    prisma.task.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lt: startOfToday } },
    }),
    prisma.project.count({ where: { status: "PAUSED" } }),
    getTopActiveNextActions(6),
    getSalesPipelineStats(now),
    getRevenueSnapshot(now, startOfMonth, endOfMonth),
    getDeliverySnapshot(now),
    prisma.task.count({ where: { status: "BLOCKED" } }),
    prisma.task.count({ where: { status: "WAITING" } }),
    prisma.task.count({ where: { status: "REVIEW" } }),
  ]);

  const wonDeals = allDeals.filter((d) => d.stage === "WON");
  const closedDeals = allDeals.filter((d) => d.stage === "WON" || d.stage === "LOST");
  const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : null;
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => sum + (d.oneTimeValue ?? 0) + (d.mrrValue ?? 0), 0) / wonDeals.length
      : null;

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
            href="/tasks?filter=overdue"
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

      <NextBestActionsPanel items={nextBestActions.items} totalActive={nextBestActions.totalActive} />

      <QuickActions />

      <TodaysOverview
        newLeadsToday={newLeadsToday}
        followUpsDue={followUpsDue}
        meetingsScheduledToday={meetingsScheduledToday}
        openTaskCount={openTaskCount}
        overdueTaskCount={overdueTaskCount}
        callsScheduledToday={callsScheduledToday}
        projectsOnHold={projectsOnHold}
        todaysTasks={todaysTasks}
        startOfToday={startOfToday}
        blockedTaskCount={blockedTaskCount}
        waitingTaskCount={waitingTaskCount}
        reviewTaskCount={reviewTaskCount}
      />

      <SalesPipelinePanel
        stageData={stageData}
        hasDeals={allDeals.length > 0}
        totalPipelineValue={salesPipeline.totalPipelineValue}
        weightedPipelineValue={salesPipeline.weightedPipelineValue}
        averageDealAgeDays={salesPipeline.averageDealAgeDays}
        dealsAtRisk={salesPipeline.dealsAtRisk}
        closeRate={closeRate}
        closedDealsCount={closedDeals.length}
        wonDealsCount={wonDeals.length}
        avgDealSize={avgDealSize}
      />

      <RevenueSnapshotPanel
        mrr={revenueSnapshot.mrr}
        oneTimeThisMonth={revenueSnapshot.oneTimeThisMonth}
        revenueThisMonth={revenueSnapshot.revenueThisMonth}
        outstandingValue={revenueSnapshot.outstandingValue}
        outstandingCount={revenueSnapshot.outstandingCount}
        overdueValue={revenueSnapshot.overdueValue}
        overdueCount={revenueSnapshot.overdueCount}
        totalClients={revenueSnapshot.totalClients}
        goalTarget={revenueSnapshot.goalTarget}
        goalProgressPercent={revenueSnapshot.goalProgressPercent}
      />

      <DeliverySnapshotPanel
        activeProjectsCount={deliverySnapshot.activeProjectsCount}
        onTrack={deliverySnapshot.onTrack}
        needsAttention={deliverySnapshot.needsAttention}
        atRisk={deliverySnapshot.atRisk}
        blocked={deliverySnapshot.blocked}
        waitingOnClient={deliverySnapshot.waitingOnClient}
        waitingOnApproval={deliverySnapshot.waitingOnApproval}
        overdueProjectTasks={deliverySnapshot.overdueProjectTasks}
        upcomingDeadlines={deliverySnapshot.upcomingDeadlines}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingMeetingsPanel meetings={upcomingMeetings} timezone={user.bookingTimezone} />
        <RecentActivityPanel activities={recentActivities} />
      </div>
    </div>
  );
}
