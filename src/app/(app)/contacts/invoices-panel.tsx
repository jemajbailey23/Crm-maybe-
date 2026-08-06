"use client";

import { useActionState, useRef, useTransition } from "react";
import {
  addInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  type InvoiceFormState,
} from "./invoices-actions";
import { InvoiceStatusBadge } from "@/components/ui/badge";

const initialState: InvoiceFormState = {};

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string | null) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

type InvoiceItem = {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: Date | string | null;
  stripeInvoiceId?: string | null;
  refundedAmount?: number;
};

function InvoiceRow({ invoice }: { invoice: InvoiceItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate text-zinc-200">{invoice.description}</p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(invoice.amount)}
          {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
          {invoice.refundedAmount ? ` · ${formatCurrency(invoice.refundedAmount)} refunded` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={invoice.status}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => updateInvoiceStatus(invoice.id, e.target.value))
          }
          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <InvoiceStatusBadge status={invoice.status} />
        {invoice.refundedAmount ? (
          <span
            className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20"
            title="Refunded via Stripe"
          >
            Refunded
          </span>
        ) : null}
        {invoice.stripeInvoiceId && (
          <span
            className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/20"
            title="Synced from Stripe"
          >
            Stripe
          </span>
        )}
        <form action={deleteInvoice.bind(null, invoice.id)}>
          <button
            type="submit"
            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}

export function InvoicesPanel({
  contactId,
  invoices,
}: {
  contactId: string;
  invoices: InvoiceItem[];
}) {
  const action = addInvoice.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex-1 min-w-[9rem]">
          <label className="block text-xs font-medium text-zinc-400">Description</label>
          <input
            name="description"
            required
            placeholder="Website redesign — final payment"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-zinc-400">Amount</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="1"
            required
            placeholder="1500"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">Status</label>
          <select
            name="status"
            className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">Due</label>
          <input
            name="dueDate"
            type="date"
            className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Add invoice
        </button>
      </form>
      {state?.error && <p className="mb-2 text-sm text-red-400">{state.error}</p>}

      {invoices.length === 0 ? (
        <p className="text-sm text-zinc-500">No invoices yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {invoices.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      )}
    </div>
  );
}
