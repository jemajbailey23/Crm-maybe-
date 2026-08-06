-- Stage 2: expand the 5-stage pipeline (NEW/CONTACTED/PROPOSAL/WON/LOST) to
-- an 11-stage pipeline. This touches three columns that all share the
-- DealStage enum type: Deal.stage, Contact.pipelineStage, and
-- PipelineStageLabel.stage.
--
-- Postgres can't add/rename enum values and remap existing rows in one
-- step, so the standard pattern applies: create the new enum type, convert
-- every column to it with an explicit value mapping (NOT a blind text
-- cast — 'NEW' and 'PROPOSAL' don't exist in the new enum and would fail),
-- then swap the type names.

-- AlterEnum
BEGIN;
CREATE TYPE "DealStage_new" AS ENUM ('NEW_LEAD', 'RESEARCHING', 'READY_TO_CONTACT', 'CONTACTED', 'DISCOVERY_SCHEDULED', 'DISCOVERY_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'NURTURE');

ALTER TABLE "public"."Contact" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "public"."Deal" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "Contact" ALTER COLUMN "pipelineStage" TYPE "DealStage_new" USING (
  CASE "pipelineStage"::text
    WHEN 'NEW' THEN 'NEW_LEAD'
    WHEN 'PROPOSAL' THEN 'PROPOSAL_SENT'
    ELSE "pipelineStage"::text
  END::"DealStage_new"
);
ALTER TABLE "Deal" ALTER COLUMN "stage" TYPE "DealStage_new" USING (
  CASE "stage"::text
    WHEN 'NEW' THEN 'NEW_LEAD'
    WHEN 'PROPOSAL' THEN 'PROPOSAL_SENT'
    ELSE "stage"::text
  END::"DealStage_new"
);
ALTER TABLE "PipelineStageLabel" ALTER COLUMN "stage" TYPE "DealStage_new" USING (
  CASE "stage"::text
    WHEN 'NEW' THEN 'NEW_LEAD'
    WHEN 'PROPOSAL' THEN 'PROPOSAL_SENT'
    ELSE "stage"::text
  END::"DealStage_new"
);

ALTER TYPE "DealStage" RENAME TO "DealStage_old";
ALTER TYPE "DealStage_new" RENAME TO "DealStage";
DROP TYPE "public"."DealStage_old";

ALTER TABLE "Contact" ALTER COLUMN "pipelineStage" SET DEFAULT 'NEW_LEAD';
ALTER TABLE "Deal" ALTER COLUMN "stage" SET DEFAULT 'NEW_LEAD';
COMMIT;

-- AlterTable: add every new Deal column (all nullable, or with a safe
-- default) before touching the old value/isRecurring columns.
ALTER TABLE "Deal" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "billingMethod" "BillingType",
ADD COLUMN     "competitor" TEXT,
ADD COLUMN     "decisionMaker" TEXT,
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "leadSource" TEXT,
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "meetingDate" TIMESTAMP(3),
ADD COLUMN     "mrrValue" DOUBLE PRECISION,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextActionDueAt" TIMESTAMP(3),
ADD COLUMN     "oneTimeValue" DOUBLE PRECISION,
ADD COLUMN     "probability" INTEGER,
ADD COLUMN     "proposalAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceInterest" TEXT,
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- Backfill existing rows before dropping the columns they're sourced from.
-- value+isRecurring collapsed into oneTimeValue/mrrValue: a recurring deal's
-- value becomes its MRR, everything else becomes the one-time amount — this
-- reproduces the exact same number the deal already showed, just filed
-- under the right one of the two new fields.
UPDATE "Deal" SET
  "oneTimeValue" = CASE WHEN "isRecurring" THEN NULL ELSE "value" END,
  "mrrValue" = CASE WHEN "isRecurring" THEN "value" ELSE NULL END;

-- stageEnteredAt has no real history to draw on, so updatedAt (the last
-- time the row changed at all) is the best available proxy for "since
-- when has this deal been sitting in its current stage."
UPDATE "Deal" SET "stageEnteredAt" = "updatedAt";

ALTER TABLE "Deal" DROP COLUMN "isRecurring",
DROP COLUMN "value",
ALTER COLUMN "stage" SET DEFAULT 'NEW_LEAD';

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
