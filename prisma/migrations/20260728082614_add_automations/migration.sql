-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('LEAD_CREATED', 'PROPOSAL_SENT', 'INVOICE_PAID', 'WEBSITE_PUBLISHED', 'CLIENT_SIGNED', 'TASK_OVERDUE', 'REVIEW_REQUEST', 'MISSED_CALL', 'APPOINTMENT_BOOKED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('CREATE_TASK', 'SEND_EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "missed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "overdueNotified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskTitle" TEXT,
    "taskDueInDays" INTEGER,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "webhookUrl" TEXT,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "summary" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
