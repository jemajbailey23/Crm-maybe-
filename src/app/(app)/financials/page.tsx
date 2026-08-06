import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart } from "@/components/ui/bar-chart";
import { ProfitMarginControl } from "./profit-margin-control";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function formatCurrency(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

function last6Months(now: Date) {
  return Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    return {
      label: format(monthDate, "MMM"),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    };
  });
}

export default async function FinancialsPage() {
  const user = await requireUser();
  const now = new Date();

  const startOfThisMonth = startOfMonth(now);
  const endOfThisMonth = endOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));
  const endOfLastMonth = endOfMonth(subMonths(now, 1));

  const [services, invoices, deals, totalClients, clientContacts] = await Promise.all([
    prisma.service.findMany({
      select: { billingType: true, amount: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      select: { amount: true, status: true, paidAt: true },
    }),
    prisma.deal.findMany({
      where: { stage: { in: ["WON", "LOST"] } },
      select: { stage: true, value: true },
    }),
    prisma.contact.count({ where: { status: "CLIENT" } }),
    prisma.contact.findMany({
      where: { status: "CLIENT" },
      select: { createdAt: true },
    }),
  ]);

  const mrrAsOf = (date: Date) =>
    services
      .filter((s) => s.billingType === "MONTHLY" && s.createdAt <= date)
      .reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const mrr = mrrAsOf(now);
  const activeSubscriptionCount = services.filter(
    (s) => s.billingType === "MONTHLY"
  ).length;

  const outstandingInvoices = invoices.filter(
    (i) => i.status === "SENT" || i.status === "OVERDUE"
  );
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0);

  const paidInThisMonth = invoices.filter(
    (i) =>
      i.status === "PAID" &&
      i.paidAt &&
      i.paidAt >= startOfThisMonth &&
      i.paidAt <= endOfThisMonth
  );
  const paidInLastMonth = invoices.filter(
    (i) =>
      i.status === "PAID" &&
      i.paidAt &&
      i.paidAt >= startOfLastMonth &&
      i.paidAt <= endOfLastMonth
  );
  const oneTimeThisMonth = paidInThisMonth.reduce((sum, i) => sum + i.amount, 0);
  const oneTimeLastMonth = paidInLastMonth.reduce((sum, i) => sum + i.amount, 0);

  const monthlyRevenue = mrr + oneTimeThisMonth;
  const lastMonthRevenue = mrrAsOf(endOfLastMonth) + oneTimeLastMonth;
  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
      : null;

  const profitEstimate = monthlyRevenue * (user.profitMarginPercent / 100);

  const wonDeals = deals.filter((d) => d.stage === "WON");
  const lostDeals = deals.filter((d) => d.stage === "LOST");
  const totalClosedSales = wonDeals.length;
  const proposalAcceptanceRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : null;

  const paidInvoiceTotal = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);
  const wonDealTotal = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const lifetimeClientValue = paidInvoiceTotal + wonDealTotal;
  const averageClientValue = totalClients > 0 ? lifetimeClientValue / totalClients : null;

  const months = last6Months(now);
  const monthlyRevenueData = months.map((m) => {
    const paid = invoices.filter(
      (i) => i.status === "PAID" && i.paidAt && i.paidAt >= m.start && i.paidAt <= m.end
    );
    const total = paid.reduce((sum, i) => sum + i.amount, 0);
    return { label: m.label, value: total, display: formatCurrency(total) };
  });
  const mrrGrowthData = months.map((m) => {
    const value = mrrAsOf(m.end);
    return { label: m.label, value, display: formatCurrency(value) };
  });
  const monthlyClientsData = months.map((m) => {
    const count = clientContacts.filter(
      (c) => c.createdAt >= m.start && c.createdAt <= m.end
    ).length;
    return { label: m.label, value: count, display: String(count) };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Financial dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Revenue, recurring subscriptions, and sales conversion at a glance.
          </p>
          <p className="mt-2 text-xs">
            {isStripeConfigured() ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Connected to Stripe — paid invoices sync automatically
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                Stripe not connected — invoices are entered manually
              </span>
            )}
          </p>
        </div>
        <ProfitMarginControl percent={user.profitMarginPercent} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Monthly revenue" value={formatCurrency(monthlyRevenue)} sub="Recurring + invoices paid this month" />
        <StatCard label="MRR" value={formatCurrency(mrr)} sub={`${activeSubscriptionCount} active subscriptions`} />
        <StatCard
          label="Outstanding invoices"
          value={formatCurrency(outstandingTotal)}
          sub={`${outstandingInvoices.length} unpaid`}
        />
        <StatCard
          label="Profit estimate"
          value={formatCurrency(profitEstimate)}
          sub={`${user.profitMarginPercent}% margin assumption`}
        />
        <StatCard
          label="Revenue growth"
          value={revenueGrowth === null ? "—" : `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%`}
          sub="vs. last month"
        />
        <StatCard
          label="Average client value"
          value={averageClientValue === null ? "—" : formatCurrency(averageClientValue)}
          sub="Lifetime value ÷ total clients"
        />
        <StatCard
          label="Lifetime client value"
          value={formatCurrency(lifetimeClientValue)}
          sub="Won deals + paid invoices, all-time"
        />
        <StatCard
          label="Total closed sales"
          value={String(totalClosedSales)}
          sub={formatCurrency(wonDealTotal)}
        />
        <StatCard
          label="Proposal acceptance rate"
          value={proposalAcceptanceRate === null ? "—" : `${proposalAcceptanceRate}%`}
          sub={`${wonDeals.length} of ${wonDeals.length + lostDeals.length} decided`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Monthly revenue</h2>
          <BarChart data={monthlyRevenueData} />
        </div>
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Monthly clients</h2>
          <BarChart data={monthlyClientsData} />
        </div>
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">MRR growth</h2>
          <BarChart data={mrrGrowthData} />
        </div>
      </div>
    </div>
  );
}
