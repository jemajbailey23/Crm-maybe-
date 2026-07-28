import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DealStageSelect } from "./deal-stage-select";
import { SearchBox } from "@/components/search-box";

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const STAGES: {
  value: "NEW" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST";
  label: string;
  dot: string;
}[] = [
  { value: "NEW", label: "New", dot: "bg-zinc-500" },
  { value: "CONTACTED", label: "Contacted", dot: "bg-blue-500" },
  { value: "PROPOSAL", label: "Proposal", dot: "bg-amber-500" },
  { value: "WON", label: "Won", dot: "bg-emerald-500" },
  { value: "LOST", label: "Lost", dot: "bg-red-500" },
];

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const deals = await prisma.deal.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { contact: { firstName: { contains: q, mode: "insensitive" } } },
            { contact: { lastName: { contains: q, mode: "insensitive" } } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track deals from first contact through close.
          </p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
        >
          New deal
        </Link>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search deals…" />
      </Suspense>

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
              className="animate-slide-up flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stage.dot}`} />
                <p className="text-sm font-semibold text-zinc-100">{stage.label}</p>
                <span className="ml-auto rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  {stageDeals.length}
                </span>
              </div>
              <p className="border-b border-zinc-800/60 px-3 py-1.5 text-xs text-zinc-500">
                {formatCurrency(stageValue) ?? "$0"}
              </p>
              <div className="flex-1 space-y-2 p-2">
                {stageDeals.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-zinc-600">Empty</p>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="group rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
                    >
                      <Link
                        href={`/deals/${deal.id}`}
                        className="block text-sm font-medium text-zinc-100 group-hover:text-indigo-400"
                      >
                        {deal.title}
                      </Link>
                      <p className="mt-0.5 text-xs font-medium text-zinc-400">
                        {formatCurrency(deal.value) ?? "No value"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
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
