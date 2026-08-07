import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, DealStage } from "@prisma/client";
import { DealStageSelect } from "./deal-stage-select";
import { SearchBox } from "@/components/search-box";
import { DealFilters } from "./deal-filters";
import { getStageLabels, stageOptions, STAGE_ORDER } from "@/lib/pipeline-stages";
import { getDealWarnings, daysInStage } from "./deal-rules";

function exportQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function formatCurrency(value: number | null) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

const STAGE_DOTS: Record<DealStage, string> = {
  NEW_LEAD: "bg-zinc-500",
  RESEARCHING: "bg-zinc-500",
  READY_TO_CONTACT: "bg-zinc-500",
  CONTACTED: "bg-blue-500",
  DISCOVERY_SCHEDULED: "bg-blue-500",
  DISCOVERY_COMPLETED: "bg-violet-500",
  PROPOSAL_SENT: "bg-amber-500",
  NEGOTIATION: "bg-amber-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
  NURTURE: "bg-violet-500",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    leadSource?: string;
    service?: string;
    owner?: string;
    overdue?: string;
    stale?: string;
    closeFrom?: string;
    closeTo?: string;
  }>;
}) {
  const { q, stage, leadSource, service, owner, overdue, stale, closeFrom, closeTo } =
    await searchParams;

  const stageLabels = await getStageLabels();
  const STAGES = stageOptions(stageLabels).map((s) => ({
    ...s,
    dot: STAGE_DOTS[s.value],
  }));

  const where: Prisma.DealWhereInput = {};
  const andClauses: Prisma.DealWhereInput[] = [];

  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { contact: { firstName: { contains: q, mode: "insensitive" } } },
        { contact: { lastName: { contains: q, mode: "insensitive" } } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (stage && STAGE_ORDER.includes(stage as DealStage)) {
    andClauses.push({ stage: stage as DealStage });
  }
  if (leadSource) andClauses.push({ leadSource });
  if (service) andClauses.push({ serviceInterest: service });
  if (owner === "unassigned") {
    andClauses.push({ assignedToId: null });
  } else if (owner) {
    andClauses.push({ assignedToId: owner });
  }
  if (closeFrom) {
    const from = new Date(closeFrom);
    if (!Number.isNaN(from.getTime())) andClauses.push({ expectedCloseDate: { gte: from } });
  }
  if (closeTo) {
    const to = new Date(closeTo);
    if (!Number.isNaN(to.getTime())) andClauses.push({ expectedCloseDate: { lte: to } });
  }
  if (andClauses.length > 0) where.AND = andClauses;

  const [deals, leadSourceRows, serviceRows, owners, bookingContacts, lastActivityByDeal] =
    await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: { contact: true, company: true, assignedTo: { select: { id: true, name: true } } },
      }),
      prisma.deal.findMany({
        where: { leadSource: { not: null } },
        distinct: ["leadSource"],
        select: { leadSource: true },
        orderBy: { leadSource: "asc" },
      }),
      prisma.deal.findMany({
        where: { serviceInterest: { not: null } },
        distinct: ["serviceInterest"],
        select: { serviceInterest: true },
        orderBy: { serviceInterest: "asc" },
      }),
      prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.booking.findMany({ distinct: ["contactId"], select: { contactId: true } }),
      prisma.activity.groupBy({
        by: ["dealId"],
        where: { dealId: { not: null } },
        _max: { occurredAt: true },
      }),
    ]);

  const now = new Date();
  const bookedContactIds = new Set(bookingContacts.map((b) => b.contactId).filter(Boolean));
  const lastActivityMap = new Map(
    lastActivityByDeal.filter((r) => r.dealId).map((r) => [r.dealId as string, r._max.occurredAt])
  );

  let enrichedDeals = deals.map((deal) => {
    const lastActivityAt = lastActivityMap.get(deal.id) ?? null;
    const hasBooking = deal.contactId ? bookedContactIds.has(deal.contactId) : false;
    const warnings = getDealWarnings(deal, lastActivityAt, hasBooking, now);
    return {
      ...deal,
      lastActivityAt,
      warnings,
      ageDays: daysInStage(deal.stageEnteredAt, now),
    };
  });

  if (overdue === "1") {
    enrichedDeals = enrichedDeals.filter((d) => d.warnings.some((w) => w.code === "overdue-next-action"));
  }
  if (stale === "1") {
    enrichedDeals = enrichedDeals.filter((d) => d.warnings.some((w) => w.code === "no-activity"));
  }

  const dealsByStage = Object.fromEntries(
    STAGES.map((s) => [s.value, enrichedDeals.filter((d) => d.stage === s.value)])
  );

  const leadSources = leadSourceRows.map((r) => r.leadSource).filter((s): s is string => !!s);
  const services = serviceRows.map((r) => r.serviceInterest).filter((s): s is string => !!s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {enrichedDeals.length} {enrichedDeals.length === 1 ? "deal" : "deals"} · Track deals from first
            contact through close.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/deals/export${exportQuery({ q, stage, leadSource, service, owner, overdue, stale, closeFrom, closeTo })}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Export CSV
          </Link>
          <Link
            href="/deals/new"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400"
          >
            New deal
          </Link>
        </div>
      </div>

      <Suspense>
        <SearchBox key={q ?? ""} placeholder="Search deals…" />
      </Suspense>

      <Suspense>
        <DealFilters
          stages={stageOptions(stageLabels)}
          leadSources={leadSources}
          services={services}
          owners={owners}
        />
      </Suspense>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-4" style={{ width: "max-content" }}>
          {STAGES.map((stageOpt) => {
            const stageDeals = dealsByStage[stageOpt.value];
            const oneTime = stageDeals.reduce((sum, d) => sum + (d.oneTimeValue ?? 0), 0);
            const mrr = stageDeals.reduce((sum, d) => sum + (d.mrrValue ?? 0), 0);
            return (
              <div
                key={stageOpt.value}
                className="animate-slide-up flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40"
              >
                <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stageOpt.dot}`} />
                  <p className="text-sm font-semibold text-zinc-100">{stageOpt.label}</p>
                  <span className="ml-auto rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="border-b border-zinc-800/60 px-3 py-1.5 text-xs text-zinc-500">
                  {[formatCurrency(oneTime), mrr ? `${formatCurrency(mrr)}/mo` : null]
                    .filter(Boolean)
                    .join(" · ") || "$0"}
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
                        <p className="truncate text-xs text-zinc-500">
                          {deal.contact
                            ? `${deal.contact.firstName} ${deal.contact.lastName}`
                            : deal.company?.name ?? "No contact"}
                        </p>
                        {deal.serviceInterest && (
                          <p className="mt-1 truncate text-xs text-zinc-400">{deal.serviceInterest}</p>
                        )}
                        <p className="mt-0.5 text-xs font-medium text-zinc-400">
                          {[formatCurrency(deal.oneTimeValue), deal.mrrValue ? `${formatCurrency(deal.mrrValue)}/mo` : null]
                            .filter(Boolean)
                            .join(" · ") || "No value"}
                        </p>
                        {deal.nextAction && (
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            Next: {deal.nextAction}
                            {deal.nextActionDueAt && ` · ${formatDate(deal.nextActionDueAt)}`}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-zinc-600">{deal.ageDays}d in stage</p>
                        {deal.warnings.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {deal.warnings.map((w) => (
                              <span
                                key={w.code}
                                className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20"
                              >
                                {w.label}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2">
                          <DealStageSelect
                            dealId={deal.id}
                            stage={deal.stage}
                            stages={stageOptions(stageLabels)}
                          />
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
    </div>
  );
}
