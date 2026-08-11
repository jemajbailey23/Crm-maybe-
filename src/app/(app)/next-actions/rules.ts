import "server-only";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays, addDays } from "date-fns";
import type { NBAPriority, DealStage } from "@prisma/client";
import { getStageThresholds } from "@/lib/stage-thresholds";
import { getStageLabels } from "@/lib/pipeline-stages";

export type NBACandidate = {
  dedupeKey: string;
  conditionSignature: string;
  category: string;
  priority: NBAPriority;
  reason: string;
  recommendedAction: string;
  dueDate: Date | null;
  href: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
};

const CLOSED_STAGES: DealStage[] = ["WON", "LOST"];
const LOST_NURTURE_ELIGIBLE_DAYS = 30;
const STALE_ACTIVITY_DAYS = 7;
const PROPOSAL_AWAITING_DAYS = 3;

function dealWho(d: { contact: { firstName: string; lastName: string; businessName: string | null } | null; company: { name: string } | null }) {
  if (d.contact) return d.contact.businessName || `${d.contact.firstName} ${d.contact.lastName}`;
  return d.company?.name ?? null;
}

function contactName(c: { firstName: string; lastName: string; businessName: string | null }) {
  return c.businessName || `${c.firstName} ${c.lastName}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function daysBetween(now: Date, date: Date) {
  return Math.max(0, differenceInCalendarDays(now, date));
}

/**
 * Runs every deterministic Next Best Action rule against real, live data and
 * returns the full "desired set" of recommendations. This is the only place
 * conditions are evaluated — actions/sync.ts diffs this list against what's
 * already persisted; nothing here touches the database beyond reads.
 */
export async function computeNextBestActionCandidates(now: Date): Promise<NBACandidate[]> {
  const [
    openDeals,
    lastActivityByDeal,
    lostDeals,
    contactsWithFollowUp,
    bookingsWithContact,
    contactsWithAnyDeal,
    stageLabels,
    thresholds,
  ] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: { notIn: CLOSED_STAGES } },
      select: {
        id: true,
        title: true,
        stage: true,
        stageEnteredAt: true,
        nextAction: true,
        nextActionDueAt: true,
        meetingDate: true,
        expectedCloseDate: true,
        contact: { select: { id: true, firstName: true, lastName: true, businessName: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.groupBy({
      by: ["dealId"],
      where: { dealId: { not: null } },
      _max: { occurredAt: true },
    }),
    prisma.deal.findMany({
      where: { stage: "LOST" },
      select: {
        id: true,
        title: true,
        stageEnteredAt: true,
        contact: { select: { id: true, firstName: true, lastName: true, businessName: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { nextFollowUpAt: { not: null } },
      select: { id: true, firstName: true, lastName: true, businessName: true, nextFollowUpAt: true },
    }),
    prisma.booking.findMany({
      where: { contactId: { not: null }, status: { not: "CANCELLED" } },
      select: { id: true, startsAt: true, name: true, contactId: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.deal.findMany({
      where: { contactId: { not: null } },
      select: { contactId: true },
      distinct: ["contactId"],
    }),
    getStageLabels(),
    getStageThresholds(),
  ]);

  const lastActivityMap = new Map(
    lastActivityByDeal.filter((r) => r.dealId).map((r) => [r.dealId as string, r._max.occurredAt])
  );
  const candidates: NBACandidate[] = [];

  for (const d of openDeals) {
    const who = dealWho(d);
    const whoSuffix = who ? ` (${who})` : "";

    // 1. Deal has no next action.
    if (!d.nextAction?.trim()) {
      candidates.push({
        dedupeKey: `no-next-action:deal:${d.id}`,
        conditionSignature: "missing",
        category: "no-next-action",
        priority: "MEDIUM",
        reason: `${d.title}${whoSuffix} has no next action defined.`,
        recommendedAction: "Set a next action and due date for this deal.",
        dueDate: now,
        href: `/deals/${d.id}`,
        contactId: d.contact?.id ?? null,
        companyId: d.company?.id ?? null,
        dealId: d.id,
      });
    }

    // 2. Next action overdue.
    if (d.nextActionDueAt && d.nextActionDueAt < now) {
      const daysOverdue = daysBetween(now, d.nextActionDueAt);
      const priority: NBAPriority = daysOverdue >= 3 ? "CRITICAL" : daysOverdue >= 1 ? "HIGH" : "MEDIUM";
      candidates.push({
        dedupeKey: `overdue-next-action:deal:${d.id}`,
        conditionSignature: `${d.nextActionDueAt.toISOString()}|${d.nextAction ?? ""}`,
        category: "overdue-next-action",
        priority,
        reason: `${d.title}${whoSuffix}: next action "${d.nextAction ?? "Follow up"}" was due ${daysOverdue === 0 ? "today" : `${daysOverdue}d ago`}.`,
        recommendedAction: d.nextAction ?? "Complete or reschedule this next action.",
        dueDate: d.nextActionDueAt,
        href: `/deals/${d.id}`,
        contactId: d.contact?.id ?? null,
        companyId: d.company?.id ?? null,
        dealId: d.id,
      });
    }

    // 3. No activity for 7+ days.
    const lastActivityAt = lastActivityMap.get(d.id) ?? d.stageEnteredAt;
    const daysSinceActivity = daysBetween(now, lastActivityAt);
    if (daysSinceActivity >= STALE_ACTIVITY_DAYS) {
      candidates.push({
        dedupeKey: `stale-activity:deal:${d.id}`,
        conditionSignature: `${lastActivityAt.toISOString()}`,
        category: "stale-activity",
        priority: daysSinceActivity >= 14 ? "HIGH" : "MEDIUM",
        reason: `No activity logged on ${d.title}${whoSuffix} in ${daysSinceActivity} days.`,
        recommendedAction: "Log a call, email, or note to keep this deal moving.",
        dueDate: now,
        href: `/deals/${d.id}`,
        contactId: d.contact?.id ?? null,
        companyId: d.company?.id ?? null,
        dealId: d.id,
      });
    }

    // 4. Discovery meeting occurred but no follow-up logged since.
    if (d.meetingDate && d.meetingDate < now) {
      const followUpLogged = lastActivityAt > d.meetingDate;
      if (!followUpLogged) {
        candidates.push({
          dedupeKey: `discovery-no-followup:deal:${d.id}`,
          conditionSignature: d.meetingDate.toISOString(),
          category: "discovery-no-followup",
          priority: "HIGH",
          reason: `Discovery meeting on ${formatDate(d.meetingDate)}${whoSuffix} happened but no follow-up has been logged.`,
          recommendedAction: "Log the discovery call outcome and set the next step.",
          dueDate: addDays(d.meetingDate, 1),
          href: `/deals/${d.id}`,
          contactId: d.contact?.id ?? null,
          companyId: d.company?.id ?? null,
          dealId: d.id,
        });
      }
    }

    // 5. Proposal sent 3+ days ago without a recorded response.
    if (d.stage === "PROPOSAL_SENT") {
      const daysInStage = daysBetween(now, d.stageEnteredAt);
      if (daysInStage >= PROPOSAL_AWAITING_DAYS) {
        const priority: NBAPriority = daysInStage >= 7 ? "CRITICAL" : daysInStage >= 5 ? "HIGH" : "MEDIUM";
        candidates.push({
          dedupeKey: `proposal-awaiting:deal:${d.id}`,
          conditionSignature: d.stageEnteredAt.toISOString(),
          category: "proposal-awaiting",
          priority,
          reason: `${d.title}${whoSuffix}: proposal has been out ${daysInStage} days with no recorded response.`,
          recommendedAction: "Follow up on the proposal.",
          dueDate: addDays(d.stageEnteredAt, PROPOSAL_AWAITING_DAYS),
          href: `/deals/${d.id}`,
          contactId: d.contact?.id ?? null,
          companyId: d.company?.id ?? null,
          dealId: d.id,
        });
      }
    }

    // 6. Expected close date passed.
    if (d.expectedCloseDate && d.expectedCloseDate < now) {
      const daysPassed = daysBetween(now, d.expectedCloseDate);
      const priority: NBAPriority = daysPassed >= 14 ? "CRITICAL" : daysPassed >= 5 ? "HIGH" : "MEDIUM";
      candidates.push({
        dedupeKey: `close-date-passed:deal:${d.id}`,
        conditionSignature: `${d.expectedCloseDate.toISOString()}|${d.stage}`,
        category: "close-date-passed",
        priority,
        reason: `Expected close date (${formatDate(d.expectedCloseDate)}) for ${d.title}${whoSuffix} has passed.`,
        recommendedAction: "Update the close date, or move this deal to Won or Lost.",
        dueDate: d.expectedCloseDate,
        href: `/deals/${d.id}`,
        contactId: d.contact?.id ?? null,
        companyId: d.company?.id ?? null,
        dealId: d.id,
      });
    }

    // 7. Deal stuck in its current stage beyond its threshold.
    const stuck = stuckInStageCandidate(d, now, thresholds, stageLabels);
    if (stuck) candidates.push(stuck);
  }

  // 8. Prospect follow-up dates: overdue (regression-safe carryover of the
  // pre-Stage-3 "overdue follow-up" behavior) and upcoming/future.
  for (const c of contactsWithFollowUp) {
    const due = c.nextFollowUpAt!;
    if (due < now) {
      const daysOverdue = daysBetween(now, due);
      const priority: NBAPriority = daysOverdue >= 3 ? "CRITICAL" : daysOverdue >= 1 ? "HIGH" : "MEDIUM";
      candidates.push({
        dedupeKey: `contact-followup-overdue:contact:${c.id}`,
        conditionSignature: due.toISOString(),
        category: "contact-followup-overdue",
        priority,
        reason: `${contactName(c)} asked to be followed up with on ${formatDate(due)} — that date has passed.`,
        recommendedAction: "Reach out to follow up.",
        dueDate: due,
        href: `/contacts/${c.id}`,
        contactId: c.id,
      });
    } else {
      candidates.push({
        dedupeKey: `contact-followup-upcoming:contact:${c.id}`,
        conditionSignature: due.toISOString(),
        category: "contact-followup-upcoming",
        priority: "LOW",
        reason: `${contactName(c)} asked to be followed up with on ${formatDate(due)}.`,
        recommendedAction: "No action needed yet — it's scheduled.",
        dueDate: due,
        href: `/contacts/${c.id}`,
        contactId: c.id,
      });
    }
  }

  // 9. Lost deal eligible for nurture.
  for (const d of lostDeals) {
    const daysSinceLost = daysBetween(now, d.stageEnteredAt);
    if (daysSinceLost >= LOST_NURTURE_ELIGIBLE_DAYS) {
      const who = dealWho(d);
      candidates.push({
        dedupeKey: `lost-nurture-eligible:deal:${d.id}`,
        conditionSignature: d.stageEnteredAt.toISOString(),
        category: "lost-nurture-eligible",
        priority: "LOW",
        reason: `${d.title}${who ? ` (${who})` : ""} was marked Lost ${daysSinceLost} days ago and may be ready for a nurture re-engagement.`,
        recommendedAction: "Consider moving this deal to Nurture and reaching out again.",
        dueDate: now,
        href: `/deals/${d.id}`,
        contactId: d.contact?.id ?? null,
        companyId: d.company?.id ?? null,
        dealId: d.id,
      });
    }
  }

  // 10. Booking occurred but the contact has no deal in the pipeline at all.
  const contactIdsWithDeal = new Set(contactsWithAnyDeal.map((d) => d.contactId).filter(Boolean));
  const seenBookingContacts = new Set<string>();
  for (const b of bookingsWithContact) {
    if (!b.contactId || contactIdsWithDeal.has(b.contactId) || seenBookingContacts.has(b.contactId)) continue;
    seenBookingContacts.add(b.contactId);
    candidates.push({
      dedupeKey: `booking-no-deal:contact:${b.contactId}`,
      conditionSignature: b.startsAt.toISOString(),
      category: "booking-no-deal",
      priority: "HIGH",
      reason: `${b.name} booked a call on ${formatDate(b.startsAt)} but has no deal in the pipeline.`,
      recommendedAction: "Create a deal for this booking.",
      dueDate: now,
      href: `/deals/new?contactId=${b.contactId}`,
      contactId: b.contactId,
    });
  }

  return candidates;
}

function stuckInStageCandidate(
  d: {
    id: string;
    title: string;
    stage: DealStage;
    stageEnteredAt: Date;
    meetingDate: Date | null;
    nextActionDueAt: Date | null;
    contact: { id: string; firstName: string; lastName: string; businessName: string | null } | null;
    company: { id: string; name: string } | null;
  },
  now: Date,
  thresholds: Partial<Record<DealStage, number>>,
  stageLabels: Record<DealStage, string>
): NBACandidate | null {
  const who = dealWho(d);
  const whoSuffix = who ? ` (${who})` : "";
  const stageLabel = stageLabels[d.stage];

  if (d.stage === "DISCOVERY_SCHEDULED") {
    if (!d.meetingDate || d.meetingDate >= now) return null;
    const daysPast = daysBetween(now, d.meetingDate);
    return {
      dedupeKey: `stuck-in-stage:deal:${d.id}`,
      conditionSignature: `${d.stage}|${d.meetingDate.toISOString()}`,
      category: "stuck-in-stage",
      priority: daysPast >= 3 ? "HIGH" : "MEDIUM",
      reason: `Discovery meeting for ${d.title}${whoSuffix} was on ${formatDate(d.meetingDate)}, but the deal is still in ${stageLabel}.`,
      recommendedAction: "Log the meeting outcome and move this deal to its next stage.",
      dueDate: d.meetingDate,
      href: `/deals/${d.id}`,
      contactId: d.contact?.id ?? null,
      companyId: d.company?.id ?? null,
      dealId: d.id,
    };
  }

  if (d.stage === "NURTURE") {
    if (!d.nextActionDueAt || d.nextActionDueAt >= now) return null;
    const daysPast = daysBetween(now, d.nextActionDueAt);
    return {
      dedupeKey: `stuck-in-stage:deal:${d.id}`,
      conditionSignature: `${d.stage}|${d.nextActionDueAt.toISOString()}`,
      category: "stuck-in-stage",
      priority: daysPast >= 7 ? "HIGH" : "MEDIUM",
      reason: `Scheduled follow-up (${formatDate(d.nextActionDueAt)}) for ${d.title}${whoSuffix} has passed and it's still in Nurture.`,
      recommendedAction: "Reach back out, or update the scheduled follow-up date.",
      dueDate: d.nextActionDueAt,
      href: `/deals/${d.id}`,
      contactId: d.contact?.id ?? null,
      companyId: d.company?.id ?? null,
      dealId: d.id,
    };
  }

  const threshold = thresholds[d.stage];
  if (!threshold) return null;
  const daysInStage = daysBetween(now, d.stageEnteredAt);
  if (daysInStage < threshold) return null;

  return {
    dedupeKey: `stuck-in-stage:deal:${d.id}`,
    conditionSignature: `${d.stage}|${d.stageEnteredAt.toISOString()}|${threshold}`,
    category: "stuck-in-stage",
    priority: daysInStage >= threshold * 2 ? "HIGH" : "MEDIUM",
    reason: `${d.title}${whoSuffix} has been in ${stageLabel} for ${daysInStage} days (threshold: ${threshold}).`,
    recommendedAction: "Advance this deal to the next stage, or update its timeline.",
    dueDate: addDays(d.stageEnteredAt, threshold),
    href: `/deals/${d.id}`,
    contactId: d.contact?.id ?? null,
    companyId: d.company?.id ?? null,
    dealId: d.id,
  };
}
