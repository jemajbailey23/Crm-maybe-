import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeNextBestActionCandidates } from "./rules";

/**
 * Reconciles the persisted NextBestActionItem table with what the
 * deterministic rules currently say should exist. Runs on read (dashboard
 * load, Next Actions page load) rather than on a schedule — this app has no
 * background job runner, so freshness is "as of the last page load."
 *
 * Dedupe/reactivation contract:
 *  - A brand-new condition creates a new ACTIVE row.
 *  - An existing ACTIVE row has its display fields refreshed in place.
 *  - A SNOOZED row is left alone unless its snooze has expired, in which
 *    case it wakes back up with fresh data.
 *  - A COMPLETED or DISMISSED row is only reactivated if the underlying
 *    condition signature changed since it was resolved — this is what
 *    stops a dismissed recommendation from reappearing on every load.
 *  - An ACTIVE/SNOOZED row whose condition no longer holds (the user fixed
 *    it another way — logged activity, filled in a next action, closed the
 *    deal) is removed rather than left to rot.
 */
export async function syncNextBestActions(now: Date = new Date()): Promise<void> {
  const [candidates, existing] = await Promise.all([
    computeNextBestActionCandidates(now),
    prisma.nextBestActionItem.findMany(),
  ]);

  const existingByKey = new Map(existing.map((e) => [e.dedupeKey, e]));
  const desiredKeys = new Set(candidates.map((c) => c.dedupeKey));

  const toCreate: Prisma.NextBestActionItemCreateManyInput[] = [];
  const updates: Promise<unknown>[] = [];

  for (const c of candidates) {
    const item = existingByKey.get(c.dedupeKey);

    if (!item) {
      toCreate.push({
        dedupeKey: c.dedupeKey,
        conditionSignature: c.conditionSignature,
        category: c.category,
        priority: c.priority,
        reason: c.reason,
        recommendedAction: c.recommendedAction,
        dueDate: c.dueDate,
        href: c.href,
        status: "ACTIVE",
        contactId: c.contactId ?? null,
        companyId: c.companyId ?? null,
        dealId: c.dealId ?? null,
      });
      continue;
    }

    if (item.status === "ACTIVE") {
      updates.push(
        prisma.nextBestActionItem.update({
          where: { id: item.id },
          data: {
            conditionSignature: c.conditionSignature,
            priority: c.priority,
            reason: c.reason,
            recommendedAction: c.recommendedAction,
            dueDate: c.dueDate,
            href: c.href,
          },
        })
      );
    } else if (item.status === "SNOOZED") {
      if (item.snoozedUntil && item.snoozedUntil <= now) {
        updates.push(
          prisma.nextBestActionItem.update({
            where: { id: item.id },
            data: {
              status: "ACTIVE",
              snoozedUntil: null,
              conditionSignature: c.conditionSignature,
              priority: c.priority,
              reason: c.reason,
              recommendedAction: c.recommendedAction,
              dueDate: c.dueDate,
              href: c.href,
            },
          })
        );
      }
      // Still within its snooze window — leave it alone.
    } else if (item.conditionSignature !== c.conditionSignature) {
      // COMPLETED or DISMISSED, but the underlying condition has genuinely
      // changed (e.g. a new overdue window, a different due date, the
      // configured stage threshold changed) — bring it back.
      updates.push(
        prisma.nextBestActionItem.update({
          where: { id: item.id },
          data: {
            status: "ACTIVE",
            conditionSignature: c.conditionSignature,
            priority: c.priority,
            reason: c.reason,
            recommendedAction: c.recommendedAction,
            dueDate: c.dueDate,
            href: c.href,
            completedAt: null,
            dismissedAt: null,
          },
        })
      );
    }
    // else: COMPLETED/DISMISSED with an unchanged condition — leave it as
    // the user left it. This is the "don't regenerate dismissed
    // recommendations" contract.
  }

  const staleIds = existing
    .filter((e) => (e.status === "ACTIVE" || e.status === "SNOOZED") && !desiredKeys.has(e.dedupeKey))
    .map((e) => e.id);

  await Promise.all([
    toCreate.length > 0 ? prisma.nextBestActionItem.createMany({ data: toCreate }) : Promise.resolve(),
    ...updates,
    staleIds.length > 0
      ? prisma.nextBestActionItem.deleteMany({ where: { id: { in: staleIds } } })
      : Promise.resolve(),
  ]);
}
