import Link from "next/link";
import { BarChart } from "@/components/ui/bar-chart";
import { EmptyState } from "@/components/ui/empty-state";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesPipelinePanel({
  stageData,
  hasDeals,
  totalPipelineValue,
  weightedPipelineValue,
  averageDealAgeDays,
  dealsAtRisk,
  closeRate,
  closedDealsCount,
  wonDealsCount,
  avgDealSize,
}: {
  stageData: { label: string; value: number }[];
  hasDeals: boolean;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  averageDealAgeDays: number | null;
  dealsAtRisk: number;
  closeRate: number | null;
  closedDealsCount: number;
  wonDealsCount: number;
  avgDealSize: number | null;
}) {
  return (
    <div className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Sales pipeline</h2>
        <Link
          href="/deals"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
        >
          View pipeline →
        </Link>
      </div>

      {!hasDeals ? (
        <EmptyState message="No deals yet." actionLabel="Add a deal" actionHref="/deals/new" />
      ) : (
        <>
          <BarChart data={stageData} />

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Pipeline value
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {formatCurrency(totalPipelineValue)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Weighted value
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {formatCurrency(weightedPipelineValue)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Deals at risk
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">{dealsAtRisk}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Avg. deal age
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {averageDealAgeDays === null ? "—" : `${averageDealAgeDays}d`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Close rate
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {closeRate === null ? "—" : `${closeRate}%`}
              </p>
              <p className="text-[11px] text-zinc-500">
                {closedDealsCount > 0 ? `${wonDealsCount} of ${closedDealsCount} closed` : "No closed deals yet"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Avg. deal size
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {avgDealSize === null ? "—" : formatCurrency(avgDealSize)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
