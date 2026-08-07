import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rowsToCsv, csvResponse } from "@/lib/csv";
import { getDealWarnings, daysInStage } from "../deal-rules";
import type { DealStage, Prisma } from "@prisma/client";
import { STAGE_ORDER } from "@/lib/pipeline-stages";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const stage = searchParams.get("stage");
  const leadSource = searchParams.get("leadSource");
  const service = searchParams.get("service");
  const owner = searchParams.get("owner");
  const overdue = searchParams.get("overdue");
  const stale = searchParams.get("stale");
  const closeFrom = searchParams.get("closeFrom");
  const closeTo = searchParams.get("closeTo");
  const idsParam = searchParams.get("ids");

  // Mirrors deals/page.tsx's filter construction, kept in sync by hand —
  // duplicated rather than shared since the list page's version is
  // entangled with its board-rendering data (warnings, activity map).
  let where: Prisma.DealWhereInput;
  if (idsParam) {
    where = { id: { in: idsParam.split(",").filter(Boolean) } };
  } else {
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
    if (stage && STAGE_ORDER.includes(stage as DealStage)) andClauses.push({ stage: stage as DealStage });
    if (leadSource) andClauses.push({ leadSource });
    if (service) andClauses.push({ serviceInterest: service });
    if (owner === "unassigned") andClauses.push({ assignedToId: null });
    else if (owner) andClauses.push({ assignedToId: owner });
    if (closeFrom) {
      const from = new Date(closeFrom);
      if (!Number.isNaN(from.getTime())) andClauses.push({ expectedCloseDate: { gte: from } });
    }
    if (closeTo) {
      const to = new Date(closeTo);
      if (!Number.isNaN(to.getTime())) andClauses.push({ expectedCloseDate: { lte: to } });
    }
    where = andClauses.length > 0 ? { AND: andClauses } : {};
  }

  const [deals, bookingContacts, lastActivityByDeal] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { contact: true, company: true, assignedTo: { select: { name: true } } },
    }),
    prisma.booking.findMany({ distinct: ["contactId"], select: { contactId: true } }),
    prisma.activity.groupBy({ by: ["dealId"], where: { dealId: { not: null } }, _max: { occurredAt: true } }),
  ]);

  const now = new Date();
  const bookedContactIds = new Set(bookingContacts.map((b) => b.contactId).filter(Boolean));
  const lastActivityMap = new Map(
    lastActivityByDeal.filter((r) => r.dealId).map((r) => [r.dealId as string, r._max.occurredAt])
  );

  let enriched = deals.map((deal) => {
    const lastActivityAt = lastActivityMap.get(deal.id) ?? null;
    const hasBooking = deal.contactId ? bookedContactIds.has(deal.contactId) : false;
    return {
      ...deal,
      warnings: getDealWarnings(deal, lastActivityAt, hasBooking, now),
      ageDays: daysInStage(deal.stageEnteredAt, now),
    };
  });

  if (!idsParam) {
    if (overdue === "1") {
      enriched = enriched.filter((d) => d.warnings.some((w) => w.code === "overdue-next-action"));
    }
    if (stale === "1") {
      enriched = enriched.filter((d) => d.warnings.some((w) => w.code === "no-activity"));
    }
  }

  const headers = [
    "Title",
    "Stage",
    "Contact",
    "Company",
    "Service interest",
    "One-time value",
    "MRR value",
    "Lead source",
    "Probability",
    "Expected close date",
    "Days in stage",
    "Next action",
    "Next action due",
    "Assigned owner",
    "Lost reason",
    "Competitor",
    "Created",
  ];

  const rows = enriched.map((d) => [
    d.title,
    d.stage,
    d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "",
    d.company?.name,
    d.serviceInterest,
    d.oneTimeValue,
    d.mrrValue,
    d.leadSource,
    d.probability,
    d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : "",
    d.ageDays,
    d.nextAction,
    d.nextActionDueAt ? d.nextActionDueAt.toISOString().slice(0, 10) : "",
    d.assignedTo?.name,
    d.lostReason,
    d.competitor,
    d.createdAt.toISOString().slice(0, 10),
  ]);

  return csvResponse(rowsToCsv(headers, rows), "deals");
}
