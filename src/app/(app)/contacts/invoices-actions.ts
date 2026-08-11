"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { fireAutomationTrigger } from "@/lib/automations";

export type InvoiceFormState = { error?: string };

const STATUSES = Object.values(InvoiceStatus);

export async function addInvoice(
  contactId: string,
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const isRecurring = formData.get("isRecurring") === "on";

  if (!description) return { error: "Invoice description is required." };
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount)) return { error: "Enter a valid amount." };

  const status = STATUSES.includes(statusRaw as InvoiceStatus)
    ? (statusRaw as InvoiceStatus)
    : InvoiceStatus.DRAFT;

  await prisma.invoice.create({
    data: {
      contactId,
      description,
      amount,
      status,
      issuedDate: status === "DRAFT" ? null : new Date(),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      paidAt: status === "PAID" ? new Date() : null,
      // Manually-entered invoices default to one-time unless the user
      // flags them as billing for a recurring service — Stripe-synced
      // invoices set this automatically from the subscription instead.
      isRecurring,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  if (!STATUSES.includes(status as InvoiceStatus)) return;

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, paidAt: true },
  });
  if (!existing) return;

  // Only a genuine transition into PAID counts as "just got paid." Without
  // this, toggling PAID -> SENT -> PAID (or just re-selecting the same
  // status) would re-fire INVOICE_PAID every time — duplicate tasks,
  // duplicate emails to the client — and would also stomp the original
  // paidAt timestamp that Financials' monthly revenue reporting relies on.
  const justPaid = status === "PAID" && existing.status !== "PAID";

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: status as InvoiceStatus,
      paidAt: status === "PAID" ? (existing.paidAt ?? new Date()) : null,
    },
    include: { contact: true },
  });
  revalidatePath(`/contacts/${invoice.contactId}`);

  if (justPaid) {
    await fireAutomationTrigger("INVOICE_PAID", {
      contactId: invoice.contactId,
      summary: `${invoice.contact.businessName || `${invoice.contact.firstName} ${invoice.contact.lastName}`} — ${invoice.description} ($${invoice.amount})`,
    });
  }
}

export async function deleteInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath(`/contacts/${invoice.contactId}`);
}
