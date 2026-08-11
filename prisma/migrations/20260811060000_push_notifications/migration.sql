-- Browser push notifications: a new PushSubscription per registered
-- device, plus a PUSH_NOTIFICATION automation action type so "notify me"
-- can be chained alongside CREATE_TASK/SEND_EMAIL/WEBHOOK the same way.

-- AlterEnum
-- Not used anywhere else in this migration, so the "can't use a new enum
-- value in the same transaction it was added in" restriction doesn't
-- apply here.
ALTER TYPE "AutomationActionType" ADD VALUE 'PUSH_NOTIFICATION';

-- AlterTable: PUSH_NOTIFICATION config on AutomationAction.
ALTER TABLE "AutomationAction" ADD COLUMN "pushTitle" TEXT;
ALTER TABLE "AutomationAction" ADD COLUMN "pushBody" TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
