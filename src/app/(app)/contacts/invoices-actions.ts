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
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  return {};
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  if (!STATUSES.includes(status as InvoiceStatus)) return;

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: status as InvoiceStatus,
      paidAt: status === "PAID" ? new Date() : null,
    },
    include: { contact: true },
  });
  revalidatePath(`/contacts/${invoice.contactId}`);

  if (status === "PAID") {
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
