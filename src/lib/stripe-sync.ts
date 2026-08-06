import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { fireAutomationTrigger } from "@/lib/automations";
import { getStripeClient } from "@/lib/stripe";

async function findOrCreateContactForStripeCustomer({
  customerId,
  email,
  name,
}: {
  customerId: string;
  email: string | null;
  name: string | null;
}) {
  const linked = await prisma.contact.findUnique({ where: { stripeCustomerId: customerId } });
  if (linked) return linked;

  if (email) {
    const byEmail = await prisma.contact.findFirst({ where: { email } });
    if (byEmail) {
      return prisma.contact.update({
        where: { id: byEmail.id },
        data: { stripeCustomerId: customerId },
      });
    }
  }

  const parts = (name || email || "Stripe Customer").trim().split(" ");
  const firstName = parts[0] || "Stripe";
  const lastName = parts.slice(1).join(" ") || "Customer";

  return prisma.contact.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      status: "CLIENT", // if they're paying, they're a client
      stripeCustomerId: customerId,
    },
  });
}

function contactDisplayName(c: { firstName: string; lastName: string; businessName: string | null }) {
  return c.businessName || `${c.firstName} ${c.lastName}`;
}

// Handles both `invoice.finalized` (an invoice is ready to be paid — mirrors
// the CRM's own "Sent" status) and `invoice.paid`. Upserts by stripeInvoiceId
// so replayed/duplicate webhook deliveries update the same row instead of
// creating a second one.
export async function syncStripeInvoice(stripeInvoice: Stripe.Invoice, status: "SENT" | "PAID") {
  const customerId =
    typeof stripeInvoice.customer === "string"
      ? stripeInvoice.customer
      : stripeInvoice.customer?.id;
  if (!customerId) return;

  const contact = await findOrCreateContactForStripeCustomer({
    customerId,
    email: stripeInvoice.customer_email ?? null,
    name: stripeInvoice.customer_name ?? null,
  });

  if (status === "PAID" && contact.status === "LEAD") {
    await prisma.contact.update({ where: { id: contact.id }, data: { status: "CLIENT" } });
  }

  const amount = (status === "PAID" ? stripeInvoice.amount_paid : stripeInvoice.amount_due) / 100;
  const description =
    stripeInvoice.description || stripeInvoice.lines.data[0]?.description || "Stripe invoice";
  const dueDate = stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null;
  const paidAtSeconds = stripeInvoice.status_transitions?.paid_at;
  const paidAt = status === "PAID" ? new Date((paidAtSeconds ?? Math.floor(Date.now() / 1000)) * 1000) : null;

  await prisma.invoice.upsert({
    where: { stripeInvoiceId: stripeInvoice.id },
    update: {
      description,
      amount,
      status,
      dueDate,
      paidAt,
    },
    create: {
      stripeInvoiceId: stripeInvoice.id,
      contactId: contact.id,
      description,
      amount,
      status,
      issuedDate: new Date(stripeInvoice.created * 1000),
      dueDate,
      paidAt,
    },
  });

  if (status === "PAID") {
    await fireAutomationTrigger("INVOICE_PAID", {
      contactId: contact.id,
      summary: `${contactDisplayName(contact)} — ${description} ($${amount})`,
    });
  }
}

// Stripe's modern refund path for a paid invoice is a Credit Note (the
// Charge object no longer carries a direct `invoice` link in this API
// version). Rather than summing individual credit notes ourselves — and
// risking double-counting on a replayed webhook — we re-fetch the invoice
// from Stripe and read its `post_payment_credit_notes_amount`, which is
// Stripe's own running total of everything credited back after payment.
// That makes this handler naturally idempotent no matter how many times
// `credit_note.created`/`credit_note.updated` gets redelivered.
export async function syncStripeRefund(creditNote: Stripe.CreditNote) {
  const invoiceId = typeof creditNote.invoice === "string" ? creditNote.invoice : creditNote.invoice?.id;
  if (!invoiceId) return;

  const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: invoiceId } });
  if (!invoice) return; // not an invoice we're tracking — nothing to net out

  const stripeInvoice = await getStripeClient().invoices.retrieve(invoiceId);
  const refundedAmount = stripeInvoice.post_payment_credit_notes_amount / 100;
  if (refundedAmount <= 0) return;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { refundedAmount, refundedAt: new Date() },
  });
}

function subscriptionBillingType(subscription: Stripe.Subscription): "MONTHLY" | "ONE_TIME" {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === "month" ? "MONTHLY" : "ONE_TIME";
}

function subscriptionName(subscription: Stripe.Subscription): string {
  const price = subscription.items.data[0]?.price;
  if (price?.nickname) return price.nickname;
  if (typeof price?.product === "string") return `Stripe subscription (${price.product})`;
  return "Stripe subscription";
}

// Handles `customer.subscription.created`, `.updated`, and `.deleted`.
// Upserts by stripeSubscriptionId so the same Service row is kept in sync
// across the whole lifecycle rather than creating a new one on every event.
// Canceled subscriptions are soft-ended (endedAt set) rather than deleted,
// so past months still count correctly toward historical MRR.
export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  const contact = await findOrCreateContactForStripeCustomer({
    customerId,
    email: null,
    name: null,
  });

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const endedAt = !isActive
    ? new Date((subscription.canceled_at ?? subscription.ended_at ?? Math.floor(Date.now() / 1000)) * 1000)
    : null;
  const amount = (subscription.items.data[0]?.price?.unit_amount ?? 0) / 100;

  await prisma.service.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      name: subscriptionName(subscription),
      billingType: subscriptionBillingType(subscription),
      amount,
      endedAt,
    },
    create: {
      stripeSubscriptionId: subscription.id,
      contactId: contact.id,
      name: subscriptionName(subscription),
      billingType: subscriptionBillingType(subscription),
      amount,
      endedAt,
    },
  });
}
