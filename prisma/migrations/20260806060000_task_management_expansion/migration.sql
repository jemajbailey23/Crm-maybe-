-- AlterEnum: Priority gains CRITICAL (existing rows untouched)
ALTER TYPE "Priority" ADD VALUE 'CRITICAL';

-- AlterEnum: TaskRecurrence gains CUSTOM (existing rows untouched)
ALTER TYPE "TaskRecurrence" ADD VALUE 'CUSTOM';

-- AlterEnum: TaskStatus expands from OPEN/DONE to the full 8-value workflow.
-- Existing rows are remapped: OPEN->READY, DONE->COMPLETED. A blind
-- ::text::TaskStatus_new cast (what a naive diff produces) would fail at
-- runtime here since neither OPEN nor DONE exist in the new enum.
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('BACKLOG', 'READY', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'REVIEW', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING (
  CASE "status"::text
    WHEN 'OPEN' THEN 'READY'
    WHEN 'DONE' THEN 'COMPLETED'
    ELSE "status"::text
  END::"TaskStatus_new"
);

ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";

ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'READY';
COMMIT;

-- AlterTable: add "description" first and backfill it from "notes" before
-- dropping "notes", so existing task notes aren't silently lost.
ALTER TABLE "Task" ADD COLUMN "description" TEXT;
UPDATE "Task" SET "description" = "notes";
ALTER TABLE "Task" DROP COLUMN "notes";

-- AlterTable: the rest of the new Stage-4 fields.
ALTER TABLE "Task"
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "invoiceId" TEXT,
  ADD COLUMN "recurrenceIntervalDays" INTEGER,
  ADD COLUMN "nextInstanceCreated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "estimatedMinutes" INTEGER,
  ADD COLUMN "trackedMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "waitingReason" TEXT,
  ADD COLUMN "blockedReason" TEXT,
  ADD COLUMN "completionNotes" TEXT,
  ADD COLUMN "completionEvidenceUrl" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill completedAt for tasks that were already DONE (now COMPLETED) so
-- the new field isn't silently null for pre-existing completed work.
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';

-- CreateTable
CREATE TABLE "TaskChecklistItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
