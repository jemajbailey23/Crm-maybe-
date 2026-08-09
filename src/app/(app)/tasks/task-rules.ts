import type { TaskStatus } from "@prisma/client";

// Mirrors the Deal stage-gate pattern (see deals/deal-rules.ts): a status
// transition can be rejected server-side if a required field for that
// status hasn't been filled in yet. Kept intentionally small — Waiting and
// Blocked are the only statuses in this workflow that carry a mandatory
// "why."
export function validateTaskStatusTransition(
  nextStatus: TaskStatus,
  task: {
    waitingReason: string | null;
    blockedReason: string | null;
    requiresEvidence?: boolean;
    completionEvidenceUrl?: string | null;
  }
): string | null {
  if (nextStatus === "WAITING" && !task.waitingReason?.trim()) {
    return "Add a waiting reason before marking this task Waiting.";
  }
  if (nextStatus === "BLOCKED" && !task.blockedReason?.trim()) {
    return "Add a blocked reason before marking this task Blocked.";
  }
  // Project-template quality-control tasks can require proof of completion
  // (a link to the deployed page, doc, screenshot, etc.) before they can be
  // marked done — see Task.requiresEvidence / ProjectTemplateTask.
  if (nextStatus === "COMPLETED" && task.requiresEvidence && !task.completionEvidenceUrl?.trim()) {
    return "This task requires completion evidence (a link) before it can be marked Completed.";
  }
  return null;
}

const CLOSED_STATUSES: TaskStatus[] = ["COMPLETED", "CANCELLED"];

export function isOpenStatus(status: TaskStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}
