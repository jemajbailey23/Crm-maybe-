import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripeBalance } from "@/lib/stripe";
import { getSalesPipelineStats } from "@/app/(app)/dashboard/sales-pipeline";

// ---------------------------------------------------------------------
// Stage 6 — Financial Accuracy and Stripe Reconciliation.
//
// This module is the single source of truth for every financial metric
// shown on /financials, /dashboard, and /performance. Each function below
// documents its exact formula and data source in its comment — that
// documentation IS the audit deliverable, not a separate document, so it
// stays true as the code changes.
//
// Governing rules (from the Stage 6 spec, enforced throughout this file):
//   - "Use paid Stripe transactions and paid invoices as the source of
//     truth for collected revenue." Every Stripe payment already syncs
//     into an Invoice row (see stripe-sync.ts) — there is no separate
//     Payment/Charge table that could duplicate an Invoice. So "collected
//     revenue" always means: Invoice rows with status = PAID, net of
//     refunds. Nothing else counts as collected revenue.
//   - "Do not count won deals as collected revenue." Deal.oneTimeValue /
//     Deal.mrrValue never appear in any collected/cash/revenue figure
//     below. They only feed closedDealValue(), salesPipelineValue(), and
//     weightedPipelineValue() — explicitly forecasting/pipeline metrics.
// ---------------------------------------------------------------------

export type InvoiceRow = {
  amount: number;
  status: string;
  paidAt: Date | null;
  issuedDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  refundedAmount: number;
  isRecurring: boolean;
  contactId: string;
};

export type ServiceRow = {
  billingType: string;
  amount: number | null;
  createdAt: Date;
  endedAt: Date | null;
};

export type MrrEventRow = {
  type: "NEW" | "EXPANSION" | "CONTRACTION" | "CHURN";
  amountDelta: number;
  occurredAt: Date;
};

export type DealRow = {
  stage: string;
  oneTimeValue: number | null;
  mrrValue: number | null;
  wonAt: Date | null;
};

// Net amount actually kept from an invoice — a partial refund still counts
// as "paid," it just doesn't count toward revenue for the refunded
// portion. Used everywhere "collected"/"cash" is computed.
export function netAmount(invoice: { amount: number; refundedAmount: number }): number {
  return invoice.amount - invoice.refundedAmount;
}

function isPaidInRange(i: InvoiceRow, start: Date, end: Date): boolean {
  return i.status === "PAID" && !!i.paidAt && i.paidAt >= start && i.paidAt <= end;
}

// ---------------------------------------------------------------------
// Collected revenue (paid invoices only — the source of truth)
// ---------------------------------------------------------------------

/** Formula: Σ (amount - refundedAmount) for invoices with status=PAID and
 * paidAt within [start, end]. Source: Invoice table (unifies Stripe-synced
 * and manually-entered invoices — see stripe-sync.ts's upsert-by-
 * stripeInvoiceId, which guarantees a Stripe payment is always exactly one
 * Invoice row, never a second record). This equals oneTimeRevenueCollected
 * + recurringRevenueCollected by construction. */
export function cashCollected(invoices: InvoiceRow[], start: Date, end: Date): number {
  return invoices.filter((i) => isPaidInRange(i, start, end)).reduce((sum, i) => sum + netAmount(i), 0);
}

/** Formula: Σ amount (gross, before refunds — refunds are a separate
 * metric) for invoices issued in [start, end], regardless of payment
 * status. "Issued" = issuedDate, falling back to createdAt for rows with
 * no issuedDate set. Source: Invoice table. This is billed volume, not
 * cash — an invoice counted here may still be unpaid. */
export function invoicedRevenue(invoices: InvoiceRow[], start: Date, end: Date): number {
  return invoices
    .filter((i) => {
      const issued = i.issuedDate ?? i.createdAt;
      return issued >= start && issued <= end;
    })
    .reduce((sum, i) => sum + i.amount, 0);
}

/** Formula: Σ (amount - refundedAmount) for PAID invoices in range where
 * isRecurring = false. Source: Invoice table. */
export function oneTimeRevenueCollected(invoices: InvoiceRow[], start: Date, end: Date): number {
  return invoices
    .filter((i) => isPaidInRange(i, start, end) && !i.isRecurring)
    .reduce((sum, i) => sum + netAmount(i), 0);
}

/** Formula: Σ (amount - refundedAmount) for PAID invoices in range where
 * isRecurring = true. Source: Invoice table. Distinct from MRR: this is
 * actual cash collected from subscription invoices in the period, not the
 * current run-rate. */
export function recurringRevenueCollected(invoices: InvoiceRow[], start: Date, end: Date): number {
  return invoices
    .filter((i) => isPaidInRange(i, start, end) && i.isRecurring)
    .reduce((sum, i) => sum + netAmount(i), 0);
}

// ---------------------------------------------------------------------
// MRR (point-in-time run-rate) and its movement (period-based)
// ---------------------------------------------------------------------

/** Formula: Σ Service.amount where billingType=MONTHLY, createdAt <= asOf,
 * and (endedAt is null or endedAt > asOf). Source: Service table. A
 * point-in-time snapshot of committed recurring run-rate — NOT the same
 * as recurringRevenueCollected (actual cash in a period); a subscription
 * can be counted here before its next invoice has actually been paid. */
export function mrrAsOf(services: ServiceRow[], asOf: Date): number {
  return services
    .filter((s) => s.billingType === "MONTHLY" && s.createdAt <= asOf && (s.endedAt === null || s.endedAt > asOf))
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

function mrrEventSum(events: MrrEventRow[], type: MrrEventRow["type"], start: Date, end: Date): number {
  return events
    .filter((e) => e.type === type && e.occurredAt >= start && e.occurredAt <= end)
    .reduce((sum, e) => sum + e.amountDelta, 0);
}

/** Formula: Σ ServiceMrrEvent.amountDelta where type=NEW in [start, end].
 * Source: ServiceMrrEvent, written by stripe-sync.ts whenever a new
 * MONTHLY subscription is created. Recorded going forward only — see the
 * model's schema comment for why pre-Stage-6 history can't be
 * reconstructed. */
export function newMrr(events: MrrEventRow[], start: Date, end: Date): number {
  return mrrEventSum(events, "NEW", start, end);
}

/** Formula: Σ amountDelta where type=EXPANSION in [start, end] (an
 * existing subscription's amount increased). Source: ServiceMrrEvent. */
export function expansionMrr(events: MrrEventRow[], start: Date, end: Date): number {
  return mrrEventSum(events, "EXPANSION", start, end);
}

/** Formula: Σ amountDelta where type=CONTRACTION in [start, end] (an
 * existing subscription's amount decreased but stayed active). Stored as
 * a negative delta; returned as a positive magnitude for display. Source:
 * ServiceMrrEvent. */
export function contractionMrr(events: MrrEventRow[], start: Date, end: Date): number {
  return Math.abs(mrrEventSum(events, "CONTRACTION", start, end));
}

/** Formula: Σ amountDelta where type=CHURN in [start, end] (a subscription
 * ended). Stored as a negative delta; returned as a positive magnitude.
 * Source: ServiceMrrEvent. */
export function churnedMrr(events: MrrEventRow[], start: Date, end: Date): number {
  return Math.abs(mrrEventSum(events, "CHURN", start, end));
}

/** Formula: New + Expansion - Contraction - Churn for [start, end] (the
 * signed sum of every ServiceMrrEvent in the period). Should reconcile to
 * mrrAsOf(end) - mrrAsOf(start) for services whose full history has been
 * tracked since Stage 6 shipped. Source: ServiceMrrEvent. */
export function netMrrGrowth(events: MrrEventRow[], start: Date, end: Date): number {
  return newMrr(events, start, end) + expansionMrr(events, start, end) - contractionMrr(events, start, end) - churnedMrr(events, start, end);
}

// ---------------------------------------------------------------------
// Outstanding / overdue / refunds / failed payments
// ---------------------------------------------------------------------

/** Formula: Σ amount for invoices with status IN (SENT, OVERDUE). Gross —
 * nothing has been paid yet, so there's nothing to net out. Source:
 * Invoice table. */
export function outstandingInvoiceTotal(invoices: InvoiceRow[]): number {
  return invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").reduce((sum, i) => sum + i.amount, 0);
}

/** Formula: Σ amount for invoices with status=OVERDUE, OR status=SENT
 * with dueDate in the past (covers invoices no cron has flipped to
 * OVERDUE yet — matches the pattern already used by next-best-actions.ts
 * and the dashboard). Source: Invoice table. */
export function overdueInvoiceTotal(invoices: InvoiceRow[], now: Date): number {
  return invoices
    .filter((i) => i.status === "OVERDUE" || (i.status === "SENT" && !!i.dueDate && i.dueDate < now))
    .reduce((sum, i) => sum + i.amount, 0);
}

/** Formula: Σ refundedAmount across all invoices (all-time; pass a date
 * range via the invoices array pre-filtered by refundedAt if a scoped
 * figure is needed). Source: Invoice table. */
export function totalRefunds(invoices: InvoiceRow[]): number {
  return invoices.reduce((sum, i) => sum + i.refundedAmount, 0);
}

/** Formula: count + Σ amount from the FailedPayment table — previously
 * untracked entirely. Source: FailedPayment, written by
 * stripe-sync.ts's invoice.payment_failed handler. */
export function failedPaymentsSummary(failedPayments: { amount: number }[]): { count: number; total: number } {
  return { count: failedPayments.length, total: failedPayments.reduce((sum, f) => sum + f.amount, 0) };
}

// ---------------------------------------------------------------------
// Pipeline / closed-sales (Deal-based — NEVER counted as revenue)
// ---------------------------------------------------------------------

/** Formula: Σ (oneTimeValue + mrrValue) for WON deals with wonAt in
 * [start, end]. Source: Deal table. Explicitly a closed-sales/forecasting
 * metric per the Stage 6 spec — never added into any cash/revenue total
 * above. A won deal's actual cash only counts once it becomes a PAID
 * invoice, at which point it's counted via cashCollected(), not here. */
export function closedDealValue(deals: DealRow[], start: Date, end: Date): number {
  return deals
    .filter((d) => d.stage === "WON" && d.wonAt && d.wonAt >= start && d.wonAt <= end)
    .reduce((sum, d) => sum + (d.oneTimeValue ?? 0) + (d.mrrValue ?? 0), 0);
}

/** Delegates to dashboard/sales-pipeline.ts's getSalesPipelineStats, the
 * existing single source for pipeline value, so this module never
 * disagrees with the dashboard about what "pipeline value" means. Formula
 * there: Σ (oneTimeValue + mrrValue) for deals not in (WON, LOST). */
export async function salesPipelineValue(now: Date): Promise<{ total: number; weighted: number }> {
  const stats = await getSalesPipelineStats(now);
  return { total: stats.totalPipelineValue, weighted: stats.weightedPipelineValue };
}

// ---------------------------------------------------------------------
// Client value (collected revenue only — no deal double-counting)
// ---------------------------------------------------------------------

/** Per the Stage 6 spec's own recommended definitions, Average Client
 * Value ("total collected revenue ÷ clients with collected revenue") and
 * Lifetime Client Value ("average collected revenue per client to date")
 * are the same computation — both are computed here identically,
 * all-time, from PAID invoices only. No Deal value is included. */
export function clientValueMetrics(invoices: InvoiceRow[]): {
  totalCollected: number;
  payingClientCount: number;
  averageClientValue: number | null;
  lifetimeClientValue: number;
} {
  const paid = invoices.filter((i) => i.status === "PAID");
  const totalCollected = paid.reduce((sum, i) => sum + netAmount(i), 0);
  const payingClientCount = new Set(paid.map((i) => i.contactId)).size;
  const averageClientValue = payingClientCount > 0 ? totalCollected / payingClientCount : null;
  return {
    totalCollected,
    payingClientCount,
    averageClientValue,
    // "Lifetime client value" here is the same collected-revenue-per-
    // client average — see comment above. Kept as a separate field (not
    // just an alias) so the two dashboard cards can carry distinct labels
    // without the call sites needing to know they're numerically equal.
    lifetimeClientValue: averageClientValue ?? 0,
  };
}

/** Formula: Cash collected (a period, typically this month) × configurable
 * margin assumption (User.profitMarginPercent ÷ 100). This is an
 * ESTIMATE — there is no expense tracking in this CRM, so it is not
 * accounting profit. Labeled as such everywhere it's displayed. */
export function estimatedGrossProfit(cashCollectedAmount: number, marginPercent: number): number {
  return cashCollectedAmount * (marginPercent / 100);
}

// ---------------------------------------------------------------------
// One aggregate fetch + compute, used by /financials. Kept separate from
// the pure functions above so those stay independently unit-testable
// without a database.
// ---------------------------------------------------------------------

// Deliberately takes no date-range arguments — it fetches the full raw
// history once, and callers slice it into whatever periods they need
// (this month, last month, all-time) using the pure functions above. That
// keeps this the single DB round-trip for the financials page regardless
// of how many differently-scoped metrics are derived from it.
export async function getFinancialMetrics(now: Date) {
  const [services, invoices, deals, mrrEvents, failedPayments, stripeBalance, pipeline] = await Promise.all([
    prisma.service.findMany({
      select: { billingType: true, amount: true, createdAt: true, endedAt: true },
    }),
    prisma.invoice.findMany({
      select: {
        amount: true,
        status: true,
        paidAt: true,
        issuedDate: true,
        dueDate: true,
        createdAt: true,
        refundedAmount: true,
        isRecurring: true,
        contactId: true,
      },
    }),
    prisma.deal.findMany({
      where: { stage: { in: ["WON", "LOST"] } },
      select: { stage: true, oneTimeValue: true, mrrValue: true, wonAt: true },
    }),
    prisma.serviceMrrEvent.findMany({
      select: { type: true, amountDelta: true, occurredAt: true },
    }),
    prisma.failedPayment.findMany({ select: { amount: true, occurredAt: true } }),
    getStripeBalance(),
    salesPipelineValue(now),
  ]);

  return {
    services,
    invoices,
    deals,
    mrrEvents,
    failedPayments,
    stripeBalance,
    pipeline,
  };
}
