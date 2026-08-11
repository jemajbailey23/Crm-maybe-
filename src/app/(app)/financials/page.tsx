import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart } from "@/components/ui/bar-chart";
import { ProfitMarginControl } from "./profit-margin-control";
import { ReconciliationAlertsPanel } from "./reconciliation-alerts-panel";
import { isStripeConfigured } from "@/lib/stripe";
import {
  getFinancialMetrics,
  cashCollected,
  invoicedRevenue,
  oneTimeRevenueCollected,
  recurringRevenueCollected,
  mrrAsOf,
  newMrr,
  expansionMrr,
  contractionMrr,
  churnedMrr,
  netMrrGrowth,
  outstandingInvoiceTotal,
  overdueInvoiceTotal,
  totalRefunds,
  failedPaymentsSummary,
  closedDealValue,
  clientValueMetrics,
  estimatedGrossProfit,
} from "@/lib/finance-calculations";

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

  // Every calculation below runs through finance-calculations.ts, the
  // single documented source of truth for these formulas (see that file's
  // header comment) — this page just fetches, calls the pure functions,
  // and renders. Nothing here recomputes a formula independently.
  const [metrics, clientContacts, openAlerts] = await Promise.all([
    getFinancialMetrics(now),
    prisma.contact.findMany({ where: { status: "CLIENT" }, select: { createdAt: true } }),
    prisma.reconciliationAlert.findMany({
      where: { status: "OPEN" },
      orderBy: { detectedAt: "desc" },
      select: { id: true, type: true, message: true, detectedAt: true, contactId: true, invoiceId: true },
    }),
  ]);
  const { services, invoices, deals, mrrEvents, failedPayments, stripeBalance, pipeline } = metrics;

  // --- Collected revenue (paid invoices / Stripe — the source of truth) ---
  const cashCollectedThisMonth = cashCollected(invoices, startOfThisMonth, endOfThisMonth);
  const cashCollectedLastMonth = cashCollected(invoices, startOfLastMonth, endOfLastMonth);
  const invoicedThisMonth = invoicedRevenue(invoices, startOfThisMonth, endOfThisMonth);
  const oneTimeCollectedThisMonth = oneTimeRevenueCollected(invoices, startOfThisMonth, endOfThisMonth);
  const recurringCollectedThisMonth = recurringRevenueCollected(invoices, startOfThisMonth, endOfThisMonth);

  const revenueGrowth =
    cashCollectedLastMonth > 0
      ? Math.round(((cashCollectedThisMonth - cashCollectedLastMonth) / cashCollectedLastMonth) * 1000) / 10
      : null;

  // --- MRR + movement ---
  const mrr = mrrAsOf(services, now);
  const activeSubscriptionCount = services.filter((s) => s.billingType === "MONTHLY" && s.endedAt === null).length;
  const newMrrThisMonth = newMrr(mrrEvents, startOfThisMonth, endOfThisMonth);
  const expansionMrrThisMonth = expansionMrr(mrrEvents, startOfThisMonth, endOfThisMonth);
  const contractionMrrThisMonth = contractionMrr(mrrEvents, startOfThisMonth, endOfThisMonth);
  const churnedMrrThisMonth = churnedMrr(mrrEvents, startOfThisMonth, endOfThisMonth);
  const netMrrGrowthThisMonth = netMrrGrowth(mrrEvents, startOfThisMonth, endOfThisMonth);

  // --- Outstanding / overdue / refunds / failed payments ---
  const outstandingTotal = outstandingInvoiceTotal(invoices);
  const outstandingCount = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length;
  const overdueTotal = overdueInvoiceTotal(invoices, now);
  const totalRefunded = totalRefunds(invoices);
  const refundedInvoiceCount = invoices.filter((i) => i.refundedAmount > 0).length;
  const failedSummary = failedPaymentsSummary(failedPayments);

  // --- Estimated gross profit (renamed from "Profit estimate") ---
  const grossProfit = estimatedGrossProfit(cashCollectedThisMonth, user.profitMarginPercent);

  // --- Closed sales (Deal-based — forecasting/pipeline only, never revenue) ---
  const closedDealValueThisMonth = closedDealValue(deals, startOfThisMonth, endOfThisMonth);
  const wonDeals = deals.filter((d) => d.stage === "WON");
  const lostDeals = deals.filter((d) => d.stage === "LOST");
  const proposalAcceptanceRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : null;

  // --- Client value (collected revenue only, no deal double-counting) ---
  const clientValue = clientValueMetrics(invoices);

  const months = last6Months(now);
  const monthlyRevenueData = months.map((m) => {
    const value = cashCollected(invoices, m.start, m.end);
    return { label: m.label, value, display: formatCurrency(value) };
  });
  const mrrGrowthData = months.map((m) => {
    const value = mrrAsOf(services, m.end);
    return { label: m.label, value, display: formatCurrency(value) };
  });
  const monthlyClientsData = months.map((m) => {
    const count = clientContacts.filter((c) => c.createdAt >= m.start && c.createdAt <= m.end).length;
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

      {/* Primary metrics — collected revenue is the source of truth. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Cash collected this month"
          value={formatCurrency(cashCollectedThisMonth)}
          sub="Paid invoices, net of refunds"
        />
        <StatCard
          label="MRR"
          value={formatCurrency(mrr)}
          sub={`${activeSubscriptionCount} active subscriptions`}
        />
        <StatCard
          label="Estimated Gross Profit"
          value={formatCurrency(grossProfit)}
          sub={`Estimate: ${user.profitMarginPercent}% of cash collected — not accounting profit`}
        />
        <StatCard
          label="Outstanding invoices"
          value={formatCurrency(outstandingTotal)}
          sub={`${outstandingCount} unpaid`}
        />
        <StatCard
          label="Overdue invoices"
          value={formatCurrency(overdueTotal)}
          sub="Past due date, unpaid"
        />
        <StatCard
          label="Revenue growth"
          value={revenueGrowth === null ? "—" : `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%`}
          sub="Cash collected vs. last month"
        />
        <StatCard
          label="Average client value"
          value={clientValue.averageClientValue === null ? "—" : formatCurrency(clientValue.averageClientValue)}
          sub="Collected revenue ÷ paying clients"
        />
        <StatCard
          label="Lifetime client value"
          value={formatCurrency(clientValue.lifetimeClientValue)}
          sub="Avg. collected revenue per client to date"
        />
        {stripeBalance && (
          <>
            <StatCard
              label="Stripe available balance"
              value={formatCurrency(stripeBalance.available)}
              sub="Ready to pay out"
            />
            <StatCard
              label="Stripe pending balance"
              value={formatCurrency(stripeBalance.pending)}
              sub="Still clearing"
            />
          </>
        )}
        <StatCard
          label="Refunded"
          value={formatCurrency(totalRefunded)}
          sub={refundedInvoiceCount > 0 ? `${refundedInvoiceCount} invoice(s)` : "No refunds"}
        />
        <StatCard
          label="Failed payments"
          value={String(failedSummary.count)}
          sub={failedSummary.count > 0 ? `${formatCurrency(failedSummary.total)} attempted` : "None recorded"}
        />
      </div>

      {/* Revenue composition — one-time vs. recurring, billed vs. collected. */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Revenue composition (this month)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard compact label="One-time collected" value={formatCurrency(oneTimeCollectedThisMonth)} />
          <StatCard compact label="Recurring collected" value={formatCurrency(recurringCollectedThisMonth)} />
          <StatCard compact label="Invoiced revenue" value={formatCurrency(invoicedThisMonth)} sub="Billed, may be unpaid" />
          <StatCard compact label="Cash collected" value={formatCurrency(cashCollectedThisMonth)} sub="One-time + recurring" />
        </div>
      </div>

      {/* MRR movement — New/Expansion/Contraction/Churn, tracked going forward from Stage 6. */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          MRR movement (this month)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard compact label="New MRR" value={formatCurrency(newMrrThisMonth)} />
          <StatCard compact label="Expansion MRR" value={formatCurrency(expansionMrrThisMonth)} />
          <StatCard compact label="Contraction MRR" value={formatCurrency(contractionMrrThisMonth)} />
          <StatCard compact label="Churned MRR" value={formatCurrency(churnedMrrThisMonth)} />
          <StatCard
            compact
            label="Net MRR growth"
            value={`${netMrrGrowthThisMonth >= 0 ? "+" : ""}${formatCurrency(netMrrGrowthThisMonth)}`}
          />
        </div>
      </div>

      {/* Pipeline / closed sales — Deal-based, explicitly not revenue. */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Sales pipeline &amp; closed deals — forecasting only, not counted as revenue
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard compact label="Sales pipeline value" value={formatCurrency(pipeline.total)} />
          <StatCard compact label="Weighted pipeline value" value={formatCurrency(pipeline.weighted)} />
          <StatCard compact label="Closed deal value (this month)" value={formatCurrency(closedDealValueThisMonth)} />
          <StatCard
            compact
            label="Proposal acceptance rate"
            value={proposalAcceptanceRate === null ? "—" : `${proposalAcceptanceRate}%`}
            sub={`${wonDeals.length} of ${wonDeals.length + lostDeals.length} decided`}
          />
        </div>
      </div>

      <ReconciliationAlertsPanel alerts={openAlerts} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Cash collected</h2>
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
