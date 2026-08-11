-- Automations polish: a rule can now chain multiple actions (e.g. create a
-- task AND email the contact off the same trigger) instead of one action
-- per rule. This moves the per-action config fields that used to live
-- directly on AutomationRule into a new AutomationAction table, backfills
-- one AutomationAction per existing rule so nothing already configured
-- changes behavior, and re-points AutomationRun at the action that
-- produced it (denormalizing ruleId alongside for cheap "all runs for this
-- rule" queries).

-- CreateTable
CREATE TABLE "AutomationAction" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "actionType" "AutomationActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskTitle" TEXT,
    "taskDueInDays" INTEGER,
    "emailRecipient" "AutomationEmailRecipient" NOT NULL DEFAULT 'OWNER',
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "webhookUrl" TEXT,
    "ruleId" TEXT NOT NULL,

    CONSTRAINT "AutomationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationAction_ruleId_order_idx" ON "AutomationAction"("ruleId", "order");

ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one AutomationAction (order 0) per existing rule, carrying over
-- its single action's config exactly as it was.
INSERT INTO "AutomationAction"
  (id, "order", "actionType", "createdAt", "taskTitle", "taskDueInDays", "emailRecipient", "emailSubject", "emailBody", "webhookUrl", "ruleId")
SELECT
  gen_random_uuid()::text, 0, "actionType", "createdAt", "taskTitle", "taskDueInDays", "emailRecipient", "emailSubject", "emailBody", "webhookUrl", id
FROM "AutomationRule";

-- AlterTable: point AutomationRun at the action it ran, not just the rule.
ALTER TABLE "AutomationRun" ADD COLUMN "actionId" TEXT;
ALTER TABLE "AutomationRun" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AutomationRun" r
SET "actionId" = a.id
FROM "AutomationAction" a
WHERE a."ruleId" = r."ruleId";

-- Every rule got exactly one backfilled action above, so every existing run
-- now has a match — safe to make required.
ALTER TABLE "AutomationRun" ALTER COLUMN "actionId" SET NOT NULL;

ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "AutomationAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: the per-action config fields now live on AutomationAction.
ALTER TABLE "AutomationRule" DROP COLUMN "actionType";
ALTER TABLE "AutomationRule" DROP COLUMN "taskTitle";
ALTER TABLE "AutomationRule" DROP COLUMN "taskDueInDays";
ALTER TABLE "AutomationRule" DROP COLUMN "emailRecipient";
ALTER TABLE "AutomationRule" DROP COLUMN "emailSubject";
ALTER TABLE "AutomationRule" DROP COLUMN "emailBody";
ALTER TABLE "AutomationRule" DROP COLUMN "webhookUrl";
