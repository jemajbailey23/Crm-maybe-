import { differenceInCalendarDays } from "date-fns";
import type { DealStage } from "@prisma/client";

// ---------------------------------------------------------------------
// Stage-gate validation — required fields before a deal can move into
// certain stages. Pure functions operating on plain data so they're easy
// to test and reuse from both the full edit form and the quick stage
// dropdown on the pipeline board.
// ---------------------------------------------------------------------

export type DealGateInput = {
  contactId: string | null;
  serviceInterest: string | null;
  oneTimeValue: number | null;
  mrrValue: number | null;
  decisionMaker: string | null;
  meetingDate: Date | null;
  startDate: Date | null;
  billingMethod: string | null;
  proposalAccepted: boolean;
  lostReason: string | null;
};

// Whether this contact has any booking at all (past or future) — the
// closest available proxy for "a meeting was scheduled with them," since
// Booking isn't linked to a specific Deal.
export type HasRelatedBooking = boolean;

// Returns a human-readable reason the transition is blocked, or null if
// it's allowed. Only checks the gate for the stage being entered — moving
// through several stages at once only has to satisfy the destination's
// own requirements, not every stage skipped along the way.
export function validateStageTransition(
  nextStage: DealStage,
  deal: DealGateInput,
  hasRelatedBooking: HasRelatedBooking
): string | null {
  if (nextStage === "DISCOVERY_SCHEDULED") {
    const missing: string[] = [];
    if (!deal.contactId) missing.push("a primary contact");
    if (!deal.meetingDate && !hasRelatedBooking) missing.push("a meeting date (or a booking) for the contact");
    if (missing.length > 0) {
      return `Before moving to Discovery Scheduled, add ${missing.join(" and ")}.`;
    }
  }

  if (nextStage === "PROPOSAL_SENT") {
    const missing: string[] = [];
    if (!deal.serviceInterest?.trim()) missing.push("a service interest");
    if (!deal.oneTimeValue && !deal.mrrValue) missing.push("a price or deal value");
    if (!deal.decisionMaker?.trim()) missing.push("the primary decision-maker");
    if (missing.length > 0) {
      return `Before moving to Proposal Sent, add ${missing.join(", ")}.`;
    }
  }

  if (nextStage === "WON") {
    const missing: string[] = [];
    if (!deal.serviceInterest?.trim()) missing.push("the service package");
    if (!deal.startDate) missing.push("a start date");
    if (!deal.billingMethod) missing.push("a billing method");
    if (!deal.proposalAccepted) missing.push("confirmation the proposal was accepted");
    if (missing.length > 0) {
      return `Before marking Won, add ${missing.join(", ")}.`;
    }
  }

  if (nextStage === "LOST") {
    if (!deal.lostReason?.trim()) {
      return "Before marking Lost, add a lost reason.";
    }
  }

  return null;
}

// ---------------------------------------------------------------------
// Warnings — non-blocking signals shown on the pipeline board and deal
// detail page. Never prevents a save; just flags a deal worth a look.
// ---------------------------------------------------------------------

export type DealWarning = {
  code: string;
  label: string;
};

const STUCK_IN_STAGE_DAYS = 14;
const PROPOSAL_AWAITING_DAYS = 5;
const NO_ACTIVITY_DAYS = 7;
const CLOSED_STAGES: DealStage[] = ["WON", "LOST"];

export type DealWarningInput = {
  stage: DealStage;
  contactId: string | null;
  serviceInterest: string | null;
  oneTimeValue: number | null;
  mrrValue: number | null;
  decisionMaker: string | null;
  meetingDate: Date | null;
  startDate: Date | null;
  billingMethod: string | null;
  proposalAccepted: boolean;
  lostReason: string | null;
  stageEnteredAt: Date;
  expectedCloseDate: Date | null;
  nextActionDueAt: Date | null;
};

export function getDealWarnings(
  deal: DealWarningInput,
  lastActivityAt: Date | null,
  hasRelatedBooking: HasRelatedBooking,
  now: Date
): DealWarning[] {
  const warnings: DealWarning[] = [];
  const isClosed = CLOSED_STAGES.includes(deal.stage);

  if (!isClosed && deal.nextActionDueAt && deal.nextActionDueAt < now) {
    warnings.push({ code: "overdue-next-action", label: "Next action overdue" });
  }

  if (!isClosed) {
    const daysSinceActivity = differenceInCalendarDays(now, lastActivityAt ?? deal.stageEnteredAt);
    if (daysSinceActivity >= NO_ACTIVITY_DAYS) {
      warnings.push({ code: "no-activity", label: `No activity in ${daysSinceActivity} days` });
    }
  }

  if (!isClosed) {
    const daysInStage = differenceInCalendarDays(now, deal.stageEnteredAt);
    if (deal.stage === "PROPOSAL_SENT" && daysInStage >= PROPOSAL_AWAITING_DAYS) {
      warnings.push({ code: "proposal-awaiting", label: `Proposal awaiting response (${daysInStage}d)` });
    } else if (daysInStage >= STUCK_IN_STAGE_DAYS) {
      warnings.push({ code: "stuck-in-stage", label: `Stuck in stage ${daysInStage} days` });
    }
  }

  if (!isClosed && deal.expectedCloseDate && deal.expectedCloseDate < now) {
    warnings.push({ code: "close-date-passed", label: "Expected close date passed" });
  }

  // Same fields the stage gates require — if they've gone missing (or
  // never got backfilled for a deal created before this stage existed),
  // flag it instead of silently leaving the deal in an inconsistent state.
  const missingForCurrentStage = validateStageTransition(deal.stage, deal, hasRelatedBooking);
  if (missingForCurrentStage) {
    warnings.push({ code: "missing-info", label: "Missing required deal information" });
  }

  return warnings;
}

export function daysInStage(stageEnteredAt: Date, now: Date): number {
  return Math.max(0, differenceInCalendarDays(now, stageEnteredAt));
}
