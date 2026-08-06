import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { fireAutomationTrigger } from "@/lib/automations";

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
