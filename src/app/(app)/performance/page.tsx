import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { StatCard } from "@/components/ui/stat-card";
import { GoalTargetInput } from "./goal-target-input";
import { KpiProgressBar } from "./kpi-progress-bar";
import type { GoalMetric } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function inRange(date: Date | null, start: Date, end: Date) {
  return !!date && date >= start && date <= end;
}

export default async function PerformancePage() {
  const user = await requireUser();
  const now = new Date();

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const rangeStart = weekStart < monthStart ? weekStart : monthStart;
  const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd;

  const [activities, deals, invoices, goals] = await Promise.all([
    prisma.activity.findMany({
      where: {
        createdById: user.id,
        type: { in: ["CALL", "MEETING", "DEMO", "PROPOSAL"] },
        occurredAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { type: true, occurredAt: true },
    }),
    prisma.deal.findMany({
      where: { stage: "WON", wonAt: { gte: rangeStart, lte: rangeEnd } },
      select: { value: true, wonAt: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: rangeStart, lte: rangeEnd } },
      select: { amount: true, paidAt: true, refundedAmount: true },
    }),
    prisma.goal.findMany({ where: { userId: user.id } }),
  ]);

  const goalMap = new Map(
    goals.map((g) => [`${g.metric}_${g.period}`, g.target])
  );
  const goalFor = (metric: GoalMetric, period: "WEEKLY" | "MONTHLY") =>
    goalMap.get(`${metric}_${period}`) ?? 0;

  const countType = (type: string, start: Date, end: Date) =>
    activities.filter((a) => a.type === type && inRange(a.occurredAt, start, end))
      .length;

  const closedDeals = (start: Date, end: Date) =>
    deals.filter((d) => inRange(d.wonAt, start, end));

  const revenueClosed = (start: Date, end: Date) => {
    const dealTotal = closedDeals(start, end).reduce(
      (sum, d) => sum + (d.value ?? 0),
      0
    );
    const invoiceTotal = invoices
      .filter((i) => inRange(i.paidAt, start, end))
      .reduce((sum, i) => sum + (i.amount - i.refundedAmount), 0);
    return dealTotal + invoiceTotal;
  };

  const metrics: {
    metric: GoalMetric;
    label: string;
    weekActual: number;
    monthActual: number;
    isCurrency: boolean;
  }[] = [
    {
      metric: "CALLS",
      label: "Calls made",
      weekActual: countType("CALL", weekStart, weekEnd),
      monthActual: countType("CALL", monthStart, monthEnd),
      isCurrency: false,
    },
    {
      metric: "MEETINGS",
      label: "Meetings held",
      weekActual: countType("MEETING", weekStart, weekEnd),
      monthActual: countType("MEETING", monthStart, monthEnd),
      isCurrency: false,
    },
    {
      metric: "DEMOS",
      label: "Demos sent",
      weekActual: countType("DEMO", weekStart, weekEnd),
      monthActual: countType("DEMO", monthStart, monthEnd),
      isCurrency: false,
    },
    {
      metric: "PROPOSALS",
      label: "Proposals sent",
      weekActual: countType("PROPOSAL", weekStart, weekEnd),
      monthActual: countType("PROPOSAL", monthStart, monthEnd),
      isCurrency: false,
    },
    {
      metric: "CLIENTS_CLOSED",
      label: "Clients closed",
      weekActual: closedDeals(weekStart, weekEnd).length,
      monthActual: closedDeals(monthStart, monthEnd).length,
      isCurrency: false,
    },
    {
      metric: "REVENUE",
      label: "Revenue closed",
      weekActual: revenueClosed(weekStart, weekEnd),
      monthActual: revenueClosed(monthStart, monthEnd),
      isCurrency: true,
    },
  ];

  const display = (value: number, isCurrency: boolean) =>
    isCurrency ? formatCurrency(value) : String(value);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          CEO Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track your own performance against weekly and monthly goals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <StatCard
            key={m.metric}
            label={m.label}
            value={display(m.weekActual, m.isCurrency)}
            sub={`${display(m.monthActual, m.isCurrency)} this month`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">
            Weekly goals
          </h2>
          <div className="space-y-4">
            {metrics.map((m) => (
              <div
                key={m.metric}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm text-zinc-300">{m.label}</p>
                  <p className="text-xs text-zinc-500">
                    {display(m.weekActual, m.isCurrency)} so far this week
                  </p>
                </div>
                <GoalTargetInput
                  metric={m.metric}
                  period="WEEKLY"
                  target={goalFor(m.metric, "WEEKLY")}
                  isCurrency={m.isCurrency}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">
            Monthly goals
          </h2>
          <div className="space-y-4">
            {metrics.map((m) => (
              <div
                key={m.metric}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm text-zinc-300">{m.label}</p>
                  <p className="text-xs text-zinc-500">
                    {display(m.monthActual, m.isCurrency)} so far this month
                  </p>
                </div>
                <GoalTargetInput
                  metric={m.metric}
                  period="MONTHLY"
                  target={goalFor(m.metric, "MONTHLY")}
                  isCurrency={m.isCurrency}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Personal KPI progress
        </h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              This week
            </p>
            <div className="space-y-3">
              {metrics.map((m) => (
                <KpiProgressBar
                  key={m.metric}
                  label={m.label}
                  actual={m.weekActual}
                  target={goalFor(m.metric, "WEEKLY")}
                  display={display(m.weekActual, m.isCurrency)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              This month
            </p>
            <div className="space-y-3">
              {metrics.map((m) => (
                <KpiProgressBar
                  key={m.metric}
                  label={m.label}
                  actual={m.monthActual}
                  target={goalFor(m.metric, "MONTHLY")}
                  display={display(m.monthActual, m.isCurrency)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
