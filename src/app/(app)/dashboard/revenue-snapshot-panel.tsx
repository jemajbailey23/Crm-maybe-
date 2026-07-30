import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueSnapshotPanel({
  mrr,
  oneTimeThisMonth,
  revenueThisMonth,
  outstandingValue,
  outstandingCount,
  overdueValue,
  overdueCount,
  totalClients,
  goalTarget,
  goalProgressPercent,
}: {
  mrr: number;
  oneTimeThisMonth: number;
  revenueThisMonth: number;
  outstandingValue: number;
  outstandingCount: number;
  overdueValue: number;
  overdueCount: number;
  totalClients: number;
  goalTarget: number | null;
  goalProgressPercent: number | null;
}) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Revenue snapshot</h2>
        <Link
          href="/financials"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
        >
          View financials →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">MRR</p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">{formatCurrency(mrr)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            One-time (mo.)
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">
            {formatCurrency(oneTimeThisMonth)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Revenue this month
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">
            {formatCurrency(revenueThisMonth)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Outstanding invoices
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">
            {formatCurrency(outstandingValue)}
          </p>
          <p className="text-[11px] text-zinc-500">{outstandingCount} unpaid</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Overdue invoices
          </p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {formatCurrency(overdueValue)}
          </p>
          <p className="text-[11px] text-zinc-500">{overdueCount} overdue</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Total clients
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">{totalClients}</p>
        </div>
      </div>

      {goalTarget !== null && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">MRR goal progress</span>
            <span className="font-medium text-zinc-200">
              {formatCurrency(revenueThisMonth)} / {formatCurrency(goalTarget)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(100, goalProgressPercent ?? 0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
