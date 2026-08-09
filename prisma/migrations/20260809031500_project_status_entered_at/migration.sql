-- Tracks when a project's status last changed, same convention as
-- Deal.stageEnteredAt, so "waiting on client/approval too long" can be
-- computed transparently instead of approximated from updatedAt (which
-- changes on any edit, not just a status change). Backfilled to updatedAt
-- for existing rows as the closest available approximation, then reset
-- going forward by actions.ts whenever status actually changes.
ALTER TABLE "Project" ADD COLUMN "statusEnteredAt" TIMESTAMP(3);
UPDATE "Project" SET "statusEnteredAt" = "updatedAt";
ALTER TABLE "Project" ALTER COLUMN "statusEnteredAt" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "statusEnteredAt" SET DEFAULT CURRENT_TIMESTAMP;
