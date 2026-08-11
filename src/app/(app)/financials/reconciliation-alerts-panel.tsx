import Link from "next/link";
import { runReconciliationAction, resolveAlert, ignoreAlert } from "./reconciliation-actions";

const TYPE_LABELS: Record<string, string> = {
  STRIPE_PAYMENT_WITHOUT_INVOICE: "Stripe payment without CRM invoice",
  INVOICE_PAID_WITHOUT_PAYMENT: "Invoice paid without payment",
  REFUND_WITHOUT_TRANSACTION: "Refund without transaction",
  DUPLICATE_EXTERNAL_ID: "Possible duplicate invoice",
  SUBSCRIPTION_STATUS_MISMATCH: "Subscription status mismatch",
  DASHBOARD_TOTAL_MISMATCH: "MRR total mismatch",
};

type Alert = {
  id: string;
  type: string;
  message: string;
  detectedAt: Date;
  contactId: string | null;
  invoiceId: string | null;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function ReconciliationAlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Reconciliation alerts</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Discrepancies between Stripe, invoices, and subscriptions — checked on demand.
          </p>
        </div>
        <form action={runReconciliationAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Run reconciliation now
          </button>
        </form>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No open alerts. Run reconciliation to check Stripe and invoice records for mismatches.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20">
                    {TYPE_LABELS[alert.type] ?? alert.type}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDate(alert.detectedAt)}</span>
                </p>
                <p className="mt-1 text-zinc-300">{alert.message}</p>
                {alert.contactId && (
                  <Link
                    href={`/contacts/${alert.contactId}`}
                    className="mt-1 inline-block text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View contact →
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={resolveAlert.bind(null, alert.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
                  >
                    Resolve
                  </button>
                </form>
                <form action={ignoreAlert.bind(null, alert.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
                  >
                    Ignore
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
