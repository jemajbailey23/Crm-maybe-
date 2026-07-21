import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DealStageSelect } from "./deal-stage-select";

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const STAGES: { value: "NEW" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST"; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, company: true },
  });

  const dealsByStage = Object.fromEntries(
    STAGES.map((stage) => [
      stage.value,
      deals.filter((deal) => deal.stage === stage.value),
    ])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">
            Track deals from first contact through close.
          </p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          New deal
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {STAGES.map((stage) => {
          const stageDeals = dealsByStage[stage.value];
          const stageValue = stageDeals.reduce(
            (sum, deal) => sum + (deal.value ?? 0),
            0
          );
          return (
            <div
              key={stage.value}
              className="flex flex-col rounded-lg border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">
                  {stage.label}
                </p>
                <p className="text-xs text-slate-500">
                  {stageDeals.length} · {formatCurrency(stageValue) ?? "$0"}
                </p>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {stageDeals.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-400">Empty</p>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-md border border-slate-200 p-2"
                    >
                      <Link
                        href={`/deals/${deal.id}`}
                        className="block text-sm font-medium text-slate-900 hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(deal.value) ?? "No value"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {deal.contact
                          ? `${deal.contact.firstName} ${deal.contact.lastName}`
                          : deal.company?.name ?? ""}
                      </p>
                      <div className="mt-2">
                        <DealStageSelect dealId={deal.id} stage={deal.stage} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
