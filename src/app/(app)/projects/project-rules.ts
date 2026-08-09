import { differenceInCalendarDays } from "date-fns";
import type { ProjectStatus } from "@prisma/client";

// ---------------------------------------------------------------------
// Project health — computed at read time from transparent, inspectable
// conditions (never manually set or cached), mirroring how Deal warnings
// already work in this codebase (see deals/deal-rules.ts). Nothing here
// is stored in the database.
// ---------------------------------------------------------------------

export type ProjectHealth = "ON_TRACK" | "NEEDS_ATTENTION" | "AT_RISK" | "BLOCKED";

export type ProjectHealthReason = { code: string; label: string };

export const CLOSED_PROJECT_STATUSES: ProjectStatus[] = ["COMPLETED", "CANCELLED"];
const WAITING_STATUSES: ProjectStatus[] = ["WAITING_ON_CLIENT", "WAITING_ON_APPROVAL"];

// Thresholds — deliberately named constants so the "transparent
// conditions" the spec asks for are easy to find and adjust in one place.
const WAITING_NEEDS_ATTENTION_DAYS = 3;
const WAITING_AT_RISK_DAYS = 7;
const TOO_MANY_OVERDUE_TASKS = 2;

export type ProjectHealthInput = {
  status: ProjectStatus;
  targetCompletionDate: Date | null;
  statusEnteredAt: Date;
  hoursBudgeted: number | null;
  hoursTracked: number; // derived from summed TimeEntry.minutes, see project-hours.ts
  overdueTaskCount: number;
  milestoneOverdueCount: number;
  pendingApprovalCount: number;
};

export function computeProjectHealth(input: ProjectHealthInput, now: Date): { health: ProjectHealth; reasons: ProjectHealthReason[] } {
  const reasons: ProjectHealthReason[] = [];

  if (CLOSED_PROJECT_STATUSES.includes(input.status)) {
    return { health: "ON_TRACK", reasons: [] };
  }

  if (input.status === "BLOCKED") {
    reasons.push({ code: "blocked", label: "Project is blocked" });
    return { health: "BLOCKED", reasons };
  }

  const daysInStatus = Math.max(0, differenceInCalendarDays(now, input.statusEnteredAt));
  const isWaiting = WAITING_STATUSES.includes(input.status);

  const pastDue = !!input.targetCompletionDate && input.targetCompletionDate < now;
  if (pastDue) reasons.push({ code: "past-due", label: "Past target completion date" });

  if (input.milestoneOverdueCount > 0) {
    reasons.push({
      code: "milestone-overdue",
      label: `${input.milestoneOverdueCount} milestone${input.milestoneOverdueCount === 1 ? "" : "s"} overdue`,
    });
  }

  const hoursOverBudget = input.hoursBudgeted != null && input.hoursTracked > input.hoursBudgeted;
  if (hoursOverBudget) {
    reasons.push({
      code: "hours-over-budget",
      label: `${input.hoursTracked.toFixed(1)}h tracked vs ${input.hoursBudgeted!.toFixed(1)}h budgeted`,
    });
  }

  const waitingTooLongAtRisk = isWaiting && daysInStatus >= WAITING_AT_RISK_DAYS;
  if (waitingTooLongAtRisk) {
    reasons.push({
      code: "waiting-too-long",
      label: `${input.status === "WAITING_ON_CLIENT" ? "Waiting on client" : "Waiting on approval"} for ${daysInStatus} days`,
    });
  }

  if (pastDue || input.milestoneOverdueCount > 0 || hoursOverBudget || waitingTooLongAtRisk) {
    return { health: "AT_RISK", reasons };
  }

  if (input.overdueTaskCount >= TOO_MANY_OVERDUE_TASKS) {
    reasons.push({
      code: "overdue-tasks",
      label: `${input.overdueTaskCount} overdue tasks`,
    });
  }

  const waitingTooLongAttention = isWaiting && daysInStatus >= WAITING_NEEDS_ATTENTION_DAYS;
  if (waitingTooLongAttention) {
    reasons.push({
      code: "waiting",
      label: `${input.status === "WAITING_ON_CLIENT" ? "Waiting on client" : "Waiting on approval"} for ${daysInStatus} days`,
    });
  }

  if (input.pendingApprovalCount > 0 && input.status !== "WAITING_ON_APPROVAL") {
    reasons.push({
      code: "pending-approval",
      label: `${input.pendingApprovalCount} approval${input.pendingApprovalCount === 1 ? "" : "s"} pending`,
    });
  }

  if (input.overdueTaskCount >= TOO_MANY_OVERDUE_TASKS || waitingTooLongAttention || input.pendingApprovalCount > 0) {
    return { health: "NEEDS_ATTENTION", reasons };
  }

  return { health: "ON_TRACK", reasons: [] };
}

export function daysInStatus(statusEnteredAt: Date, now: Date): number {
  return Math.max(0, differenceInCalendarDays(now, statusEnteredAt));
}

// Builds a ProjectHealthInput from a project fetched with its tasks,
// milestones, approvals, and time entries — the single place this
// aggregation happens so the list page, detail page, and dashboard all
// agree on what "overdue" / "hours tracked" / "pending approvals" mean.
export function buildHealthInput(
  project: {
    status: ProjectStatus;
    targetCompletionDate: Date | null;
    statusEnteredAt: Date;
    hoursBudgeted: number | null;
    tasks: { status: string; dueDate: Date | null }[];
    milestones: { dueDate: Date | null; completedAt: Date | null }[];
    approvals: { status: string }[];
    timeEntries: { minutes: number }[];
  },
  now: Date
): ProjectHealthInput {
  const overdueTaskCount = project.tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.dueDate && t.dueDate < now
  ).length;
  const milestoneOverdueCount = project.milestones.filter((m) => !m.completedAt && m.dueDate && m.dueDate < now).length;
  const pendingApprovalCount = project.approvals.filter((a) => a.status === "PENDING").length;
  const hoursTracked = project.timeEntries.reduce((sum, e) => sum + e.minutes, 0) / 60;

  return {
    status: project.status,
    targetCompletionDate: project.targetCompletionDate,
    statusEnteredAt: project.statusEnteredAt,
    hoursBudgeted: project.hoursBudgeted,
    hoursTracked,
    overdueTaskCount,
    milestoneOverdueCount,
    pendingApprovalCount,
  };
}
