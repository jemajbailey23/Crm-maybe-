import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { mrrAsOf, netMrrGrowth } from "@/lib/finance-calculations";
import type { ReconciliationAlertType } from "@prisma/client";

// ---------------------------------------------------------------------
// Stage 6 — reconciliation checks. Each function below implements exactly
// one of the six checks the spec calls for, writing a ReconciliationAlert
// row when it finds a real discrepancy. All six are idempotent: re-running
// them never creates duplicate alerts for the same underlying issue,
// because every alert is written through upsertAlert() keyed by a stable
// dedupeKey derived from the issue itself (an invoice ID, a Stripe object
// ID, a date bucket) — not from when the check happened to run.
//
// Three checks (Stripe payment without invoice, subscription status
// mismatch) call the live Stripe API and are skipped entirely when Stripe
// isn't configured. The other three are pure local DB consistency checks
// and always run.
// ---------------------------------------------------------------------

type AlertInput = {
  type: ReconciliationAlertType;
  message: string;
  dedupeKey: string;
  contactId?: string | null;
  invoiceId?: string | null;
};

async function upsertAlert(input: AlertInput): Promise<boolean> {
  // Dedupe by the issue itself, not by run — an alert already on record
  // (whether still OPEN or already RESOLVED/IGNORED by the owner) is left
  // untouched. This means dismissing an alert as "not a real problem"
  // sticks across future reconciliation runs instead of reappearing every
  // time the check re-executes.
  const existing = await prisma.reconciliationAlert.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) return false;
  await prisma.reconciliationAlert.create({
    data: {
      type: input.type,
      message: input.message,
      dedupeKey: input.dedupeKey,
      contactId: input.contactId ?? null,
      invoiceId: input.invoiceId ?? null,
    },
  });
  return true;
}

// Check: "CRM invoice marked paid without a matching payment."
// A row can only ever reach status=PAID through code paths that also set
// paidAt (see invoices-actions.ts and stripe-sync.ts) — so paidAt=null on
// a PAID invoice means it was set some other way (a direct DB edit, a bug,
// a bad import) and has no real payment date backing it up.
async function checkInvoicePaidWithoutPayment() {
  const suspects = await prisma.invoice.findMany({
    where: { status: "PAID", paidAt: null },
    select: { id: true, contactId: true, description: true, amount: true },
  });
  for (const inv of suspects) {
    await upsertAlert({
      type: "INVOICE_PAID_WITHOUT_PAYMENT",
      message: `Invoice "${inv.description}" ($${inv.amount}) is marked Paid but has no paid date recorded — there's no confirmed payment behind this status.`,
      dedupeKey: `invoice-paid-without-payment:${inv.id}`,
      contactId: inv.contactId,
      invoiceId: inv.id,
    });
  }
}

// Check: "Refund without an original transaction."
// A refund only makes sense against an invoice that was actually paid —
// refundedAmount > 0 on an invoice that isn't (or is no longer) PAID means
// money was credited back against a payment this CRM has no record of.
async function checkRefundWithoutTransaction() {
  const suspects = await prisma.invoice.findMany({
    where: { refundedAmount: { gt: 0 }, status: { not: "PAID" } },
    select: { id: true, contactId: true, description: true, refundedAmount: true, status: true },
  });
  for (const inv of suspects) {
    await upsertAlert({
      type: "REFUND_WITHOUT_TRANSACTION",
      message: `Invoice "${inv.description}" has $${inv.refundedAmount} refunded but its status is ${inv.status}, not Paid — there's no original transaction on record to refund.`,
      dedupeKey: `refund-without-transaction:${inv.id}`,
      contactId: inv.contactId,
      invoiceId: inv.id,
    });
  }
}

// Check: "Manual and synced invoice records overlap" (reported under the
// DUPLICATE_EXTERNAL_ID bucket, since the underlying risk is the same —
// one real-world payment counted as two rows). Stripe payments can never
// literally duplicate a stripeInvoiceId (it's a unique column, enforced by
// the upsert in stripe-sync.ts), so the real risk is a *different* row: a
// manually-entered invoice that happens to describe the same charge a
// Stripe webhook already recorded. Flags same-contact, same-amount, both
// PAID, paid within a day of each other, where exactly one side is
// Stripe-synced and the other isn't.
async function checkManualSyncedOverlap() {
  const paid = await prisma.invoice.findMany({
    where: { status: "PAID" },
    select: {
      id: true,
      contactId: true,
      amount: true,
      paidAt: true,
      stripeInvoiceId: true,
      description: true,
    },
  });

  const byContact = new Map<string, typeof paid>();
  for (const inv of paid) {
    const list = byContact.get(inv.contactId);
    if (list) list.push(inv);
    else byContact.set(inv.contactId, [inv]);
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  for (const invoices of byContact.values()) {
    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const a = invoices[i];
        const b = invoices[j];
        const aSynced = a.stripeInvoiceId !== null;
        const bSynced = b.stripeInvoiceId !== null;
        if (aSynced === bSynced) continue; // only manual+synced pairs are the risk here
        if (a.amount !== b.amount) continue;
        if (!a.paidAt || !b.paidAt) continue;
        if (Math.abs(a.paidAt.getTime() - b.paidAt.getTime()) > ONE_DAY_MS) continue;

        const [manual, synced] = aSynced ? [b, a] : [a, b];
        await upsertAlert({
          type: "DUPLICATE_EXTERNAL_ID",
          message: `Manually-entered invoice "${manual.description}" ($${manual.amount}) looks like it may duplicate Stripe-synced invoice "${synced.description}" — same client, same amount, paid within a day of each other.`,
          dedupeKey: `duplicate-external-id:${manual.id}:${synced.id}`,
          contactId: manual.contactId,
          invoiceId: manual.id,
        });
      }
    }
  }
}

// Check: "Stripe payment without a CRM invoice." Lists Stripe's own paid
// invoices in a bounded lookback window and confirms each one has a
// matching local Invoice row (by stripeInvoiceId). A gap here means a
// webhook was never delivered/processed for that payment — the most
// direct signal that revenue exists in Stripe but isn't reflected in the
// CRM's source of truth.
async function checkStripePaymentsWithoutInvoice(lookbackDays = 90) {
  if (!isStripeConfigured()) return;
  try {
    const stripe = getStripeClient();
    const since = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);
    const result = await stripe.invoices.list({ status: "paid", created: { gte: since }, limit: 100 });

    for (const stripeInvoice of result.data) {
      const local = await prisma.invoice.findUnique({ where: { stripeInvoiceId: stripeInvoice.id } });
      if (local) continue;
      const amount = (stripeInvoice.amount_paid / 100).toFixed(2);
      await upsertAlert({
        type: "STRIPE_PAYMENT_WITHOUT_INVOICE",
        message: `Stripe shows invoice ${stripeInvoice.number ?? stripeInvoice.id} paid ($${amount}) but no matching CRM invoice exists — the webhook may not have been delivered or processed.`,
        dedupeKey: `stripe-payment-without-invoice:${stripeInvoice.id}`,
      });
    }
  } catch (err) {
    console.error("[reconciliation] failed to check Stripe payments without invoice", err);
  }
}

// Check: "Subscription status mismatch." For every Service the CRM still
// considers active (endedAt is null) and that came from a real Stripe
// subscription, re-fetches that subscription from Stripe and confirms it's
// still active/trialing there too. Catches the case where a subscription
// was canceled directly in Stripe (or its webhook was missed) and the CRM
// never found out, so it keeps counting toward MRR that no longer exists.
async function checkSubscriptionStatusMismatch() {
  if (!isStripeConfigured()) return;
  const activeServices = await prisma.service.findMany({
    where: { stripeSubscriptionId: { not: null }, endedAt: null },
    select: { id: true, stripeSubscriptionId: true, contactId: true, name: true },
  });
  if (activeServices.length === 0) return;

  const stripe = getStripeClient();
  for (const service of activeServices) {
    try {
      const subscription = await stripe.subscriptions.retrieve(service.stripeSubscriptionId!);
      const stripeIsActive = subscription.status === "active" || subscription.status === "trialing";
      if (!stripeIsActive) {
        await upsertAlert({
          type: "SUBSCRIPTION_STATUS_MISMATCH",
          message: `Service "${service.name}" is still active in the CRM, but Stripe shows its subscription as ${subscription.status}.`,
          dedupeKey: `subscription-status-mismatch:${service.id}:${subscription.status}`,
          contactId: service.contactId,
        });
      }
    } catch (err) {
      console.error("[reconciliation] failed to check subscription", service.stripeSubscriptionId, err);
    }
  }
}

// Check: "Dashboard total mismatch." mrrAsOf() (a point-in-time snapshot
// computed from Service rows) and netMrrGrowth() (a sum of ServiceMrrEvent
// deltas) are two independent ways of arriving at the same number — they
// should always reconcile: mrrAsOf(now) - mrrAsOf(30 days ago) ==
// netMrrGrowth(30-days-ago, now). A real gap means something changed a
// Service's amount/endedAt without going through the event-recording path
// in stripe-sync.ts (a direct DB edit, or — expected and not a bug — a
// subscription active before Stage 6 shipped, since MRR events are only
// recorded going forward).
async function checkDashboardTotalMismatch(now: Date) {
  const [services, mrrEvents] = await Promise.all([
    prisma.service.findMany({ select: { billingType: true, amount: true, createdAt: true, endedAt: true } }),
    prisma.serviceMrrEvent.findMany({ select: { type: true, amountDelta: true, occurredAt: true } }),
  ]);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - THIRTY_DAYS_MS);
  const actualDelta = mrrAsOf(services, now) - mrrAsOf(services, start);
  const trackedDelta = netMrrGrowth(mrrEvents, start, now);
  const discrepancy = Math.abs(actualDelta - trackedDelta);

  // A dollar or two of floating-point noise is expected; only a real,
  // material gap is worth surfacing.
  if (discrepancy > 1) {
    await upsertAlert({
      type: "DASHBOARD_TOTAL_MISMATCH",
      message: `MRR moved $${actualDelta.toFixed(2)} over the last 30 days, but tracked MRR events only account for $${trackedDelta.toFixed(2)} — likely a subscription that changed outside a Stripe webhook (e.g. a service active before Stage 6 shipped, or a manually-edited Service record).`,
      dedupeKey: `dashboard-total-mismatch:${start.toISOString().slice(0, 10)}`,
    });
  }
}

/** Runs every reconciliation check and returns how many new alerts each
 * one created. Safe to call repeatedly (e.g. from a "Run reconciliation"
 * button on /financials) — already-tracked issues are never duplicated.
 * This CRM has no background job scheduler, so unlike webhook-driven
 * syncing, reconciliation only runs when explicitly triggered — that's a
 * known limitation, documented in the Stage 6 report. */
export async function runReconciliation(now: Date = new Date()): Promise<{ alertsCreated: number }> {
  const before = await prisma.reconciliationAlert.count();

  await Promise.all([
    checkInvoicePaidWithoutPayment(),
    checkRefundWithoutTransaction(),
    checkManualSyncedOverlap(),
    checkStripePaymentsWithoutInvoice(),
    checkSubscriptionStatusMismatch(),
    checkDashboardTotalMismatch(now),
  ]);

  const after = await prisma.reconciliationAlert.count();
  return { alertsCreated: after - before };
}
