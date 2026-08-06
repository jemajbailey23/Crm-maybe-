-- CreateEnum
CREATE TYPE "NBAPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "NBAStatus" AS ENUM ('ACTIVE', 'SNOOZED', 'COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "NextBestActionItem" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "conditionSignature" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "NBAPriority" NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "href" TEXT NOT NULL,
    "status" "NBAStatus" NOT NULL DEFAULT 'ACTIVE',
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextBestActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStageThreshold" (
    "stage" "DealStage" NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "PipelineStageThreshold_pkey" PRIMARY KEY ("stage")
);

-- CreateIndex
CREATE UNIQUE INDEX "NextBestActionItem_dedupeKey_key" ON "NextBestActionItem"("dedupeKey");

-- CreateIndex
CREATE INDEX "NextBestActionItem_status_priority_idx" ON "NextBestActionItem"("status", "priority");

-- CreateIndex
CREATE INDEX "NextBestActionItem_dueDate_idx" ON "NextBestActionItem"("dueDate");

-- AddForeignKey
ALTER TABLE "NextBestActionItem" ADD CONSTRAINT "NextBestActionItem_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextBestActionItem" ADD CONSTRAINT "NextBestActionItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextBestActionItem" ADD CONSTRAINT "NextBestActionItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

