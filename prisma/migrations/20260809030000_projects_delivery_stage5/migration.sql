-- Stage 5: Projects and Delivery.
--
-- Expands ProjectStatus from 4 values to a full 10-stage delivery
-- workflow, adds the new Project fields, adds ProjectMilestone /
-- ProjectApproval / ProjectTemplate (+ its task/approval blueprints), adds
-- two Task flags for quality-control/evidence-required tasks, and seeds
-- the 8 required starter templates with real default tasks.

-- ---------------------------------------------------------------------
-- ProjectStatus: 4 -> 10 values. Existing rows are remapped:
-- ON_HOLD -> PAUSED (closest existing meaning). Everything else keeps its
-- name. A blind ::text::ProjectStatus_new cast (what a naive diff
-- produces) would fail at runtime since ON_HOLD doesn't exist in the new
-- enum — must use a CASE WHEN mapping.
-- ---------------------------------------------------------------------
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM (
  'NOT_STARTED', 'PLANNING', 'IN_PROGRESS', 'WAITING_ON_CLIENT',
  'WAITING_ON_APPROVAL', 'BLOCKED', 'QUALITY_REVIEW', 'COMPLETED',
  'PAUSED', 'CANCELLED'
);

ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING (
  CASE "status"::text
    WHEN 'ON_HOLD' THEN 'PAUSED'
    ELSE "status"::text
  END::"ProjectStatus_new"
);

ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";

ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ---------------------------------------------------------------------
-- Project: rename dueDate -> targetCompletionDate (same data, clearer
-- name now that actualCompletionDate exists alongside it), plus the new
-- Stage 5 fields. All nullable/defaulted so existing rows load safely.
-- ---------------------------------------------------------------------
ALTER TABLE "Project" RENAME COLUMN "dueDate" TO "targetCompletionDate";

ALTER TABLE "Project"
  ADD COLUMN "actualCompletionDate" TIMESTAMP(3),
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "service" TEXT,
  ADD COLUMN "blockedReason" TEXT,
  ADD COLUMN "waitingReason" TEXT,
  ADD COLUMN "hoursBudgeted" DOUBLE PRECISION,
  ADD COLUMN "estimatedDeliveryCost" DOUBLE PRECISION,
  ADD COLUMN "estimatedProfitability" DOUBLE PRECISION,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "clientFacingNotes" TEXT,
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "templateId" TEXT;

CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------
CREATE TABLE "ProjectMilestone" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "projectId" TEXT NOT NULL,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
ALTER TABLE "ProjectMilestone"
  ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectApproval" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL,
  CONSTRAINT "ProjectApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectApproval_projectId_idx" ON "ProjectApproval"("projectId");
ALTER TABLE "ProjectApproval"
  ADD CONSTRAINT "ProjectApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectTemplate_name_key" ON "ProjectTemplate"("name");

CREATE TABLE "ProjectTemplateTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDateOffsetDays" INTEGER,
  "isQualityControl" BOOLEAN NOT NULL DEFAULT false,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "templateId" TEXT NOT NULL,
  "dependsOnId" TEXT,
  CONSTRAINT "ProjectTemplateTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectTemplateTask_templateId_idx" ON "ProjectTemplateTask"("templateId");
ALTER TABLE "ProjectTemplateTask"
  ADD CONSTRAINT "ProjectTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProjectTemplateTask_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "ProjectTemplateTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectTemplateApproval" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "dueDateOffsetDays" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "templateId" TEXT NOT NULL,
  CONSTRAINT "ProjectTemplateApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectTemplateApproval_templateId_idx" ON "ProjectTemplateApproval"("templateId");
ALTER TABLE "ProjectTemplateApproval"
  ADD CONSTRAINT "ProjectTemplateApproval_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Project_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Task: quality-control / evidence-required flags, used by templates and
-- enforced in tasks/actions.ts (a requiresEvidence task can't be marked
-- Completed without completionEvidenceUrl set).
-- ---------------------------------------------------------------------
ALTER TABLE "Task"
  ADD COLUMN "isQualityControl" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresEvidence" BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- Seed the 8 required starter templates with real default tasks,
-- due-date offsets, in-template dependencies, QC flags, evidence
-- requirements, and required approvals. Explicit ids so dependencies can
-- reference sibling rows directly within this same migration.
-- ---------------------------------------------------------------------

INSERT INTO "ProjectTemplate" ("id", "name", "description", "createdAt", "updatedAt") VALUES
('ptpl_client_onboarding', 'Client onboarding', 'Get a newly signed client set up: contract, billing, kickoff, and account access.', now(), now()),
('ptpl_website_build', 'Website build', 'Discovery through launch for a new client website.', now(), now()),
('ptpl_local_seo_onboarding', 'Local SEO onboarding', 'Audit, research, and initial optimization pass for a new local SEO client.', now(), now()),
('ptpl_gbp_optimization', 'Google Business Profile optimization', 'Claim, optimize, and set up an ongoing cadence for a client''s GBP listing.', now(), now()),
('ptpl_ai_receptionist', 'AI receptionist setup', 'Design, build, test, and launch an AI call/chat receptionist.', now(), now()),
('ptpl_crm_automation', 'CRM and automation setup', 'Map workflows and build out CRM automations for a client.', now(), now()),
('ptpl_monthly_reporting', 'Monthly reporting', 'Recurring monthly performance report production and delivery.', now(), now()),
('ptpl_client_offboarding', 'Client offboarding', 'Wind down a client engagement: handoff, billing, and archiving.', now(), now());

-- Client onboarding
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_onb_1', 'Send welcome email and contract', NULL, 0, false, false, 1, 'ptpl_client_onboarding', NULL),
('ptplt_onb_2', 'Collect countersigned agreement and billing details', NULL, 1, false, false, 2, 'ptpl_client_onboarding', 'ptplt_onb_1'),
('ptplt_onb_3', 'Set up client folder and CRM record', NULL, 1, false, false, 3, 'ptpl_client_onboarding', NULL),
('ptplt_onb_4', 'Schedule kickoff call', NULL, 2, false, false, 4, 'ptpl_client_onboarding', NULL),
('ptplt_onb_5', 'Confirm access to required accounts (domain, GBP, socials)', NULL, 3, true, true, 5, 'ptpl_client_onboarding', 'ptplt_onb_4');
INSERT INTO "ProjectTemplateApproval" ("id", "label", "dueDateOffsetDays", "order", "templateId") VALUES
('ptpla_onb_1', 'Client confirms onboarding checklist complete', 5, 1, 'ptpl_client_onboarding');

-- Website build
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_web_1', 'Discovery call and content collection', NULL, 0, false, false, 1, 'ptpl_website_build', NULL),
('ptplt_web_2', 'Sitemap and wireframes', NULL, 5, false, false, 2, 'ptpl_website_build', 'ptplt_web_1'),
('ptplt_web_3', 'Design mockups', NULL, 10, false, false, 3, 'ptpl_website_build', 'ptplt_web_2'),
('ptplt_web_4', 'Build pages', NULL, 20, false, false, 4, 'ptpl_website_build', 'ptplt_web_3'),
('ptplt_web_5', 'QA pass (cross-browser and mobile)', NULL, 25, true, true, 5, 'ptpl_website_build', 'ptplt_web_4'),
('ptplt_web_6', 'Launch and DNS cutover', NULL, 27, false, false, 6, 'ptpl_website_build', 'ptplt_web_5');
INSERT INTO "ProjectTemplateApproval" ("id", "label", "dueDateOffsetDays", "order", "templateId") VALUES
('ptpla_web_1', 'Client approves final design mockups', 12, 1, 'ptpl_website_build'),
('ptpla_web_2', 'Client approves site for launch', 26, 2, 'ptpl_website_build');

-- Local SEO onboarding
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_seo_1', 'Run local SEO audit', NULL, 0, false, false, 1, 'ptpl_local_seo_onboarding', NULL),
('ptplt_seo_2', 'Keyword and competitor research', NULL, 3, false, false, 2, 'ptpl_local_seo_onboarding', 'ptplt_seo_1'),
('ptplt_seo_3', 'On-page optimization pass', NULL, 7, false, false, 3, 'ptpl_local_seo_onboarding', 'ptplt_seo_2'),
('ptplt_seo_4', 'Citation and NAP consistency check', NULL, 7, false, false, 4, 'ptpl_local_seo_onboarding', NULL),
('ptplt_seo_5', 'Baseline ranking report', NULL, 10, true, true, 5, 'ptpl_local_seo_onboarding', 'ptplt_seo_3');

-- Google Business Profile optimization
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_gbp_1', 'Claim and verify GBP listing', NULL, 0, false, false, 1, 'ptpl_gbp_optimization', NULL),
('ptplt_gbp_2', 'Optimize profile (categories, services, photos, description)', NULL, 2, false, false, 2, 'ptpl_gbp_optimization', 'ptplt_gbp_1'),
('ptplt_gbp_3', 'Set up posting and review-response cadence', NULL, 3, false, false, 3, 'ptpl_gbp_optimization', NULL),
('ptplt_gbp_4', 'QC review of profile completeness', NULL, 4, true, true, 4, 'ptpl_gbp_optimization', 'ptplt_gbp_2');

-- AI receptionist setup
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_ai_1', 'Discovery: call flows and FAQs', NULL, 0, false, false, 1, 'ptpl_ai_receptionist', NULL),
('ptplt_ai_2', 'Build call/chat flow', NULL, 3, false, false, 2, 'ptpl_ai_receptionist', 'ptplt_ai_1'),
('ptplt_ai_3', 'Connect phone number and integrations', NULL, 5, false, false, 3, 'ptpl_ai_receptionist', 'ptplt_ai_2'),
('ptplt_ai_4', 'Test calls end-to-end', NULL, 7, true, true, 4, 'ptpl_ai_receptionist', 'ptplt_ai_3'),
('ptplt_ai_5', 'Launch and monitor first week', NULL, 8, false, false, 5, 'ptpl_ai_receptionist', 'ptplt_ai_4');
INSERT INTO "ProjectTemplateApproval" ("id", "label", "dueDateOffsetDays", "order", "templateId") VALUES
('ptpla_ai_1', 'Client approves call script and flow', 4, 1, 'ptpl_ai_receptionist');

-- CRM and automation setup
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_crm_1', 'Map current workflow and automation goals', NULL, 0, false, false, 1, 'ptpl_crm_automation', NULL),
('ptplt_crm_2', 'Configure CRM pipeline and stages', NULL, 2, false, false, 2, 'ptpl_crm_automation', 'ptplt_crm_1'),
('ptplt_crm_3', 'Build automations', NULL, 5, false, false, 3, 'ptpl_crm_automation', 'ptplt_crm_2'),
('ptplt_crm_4', 'Test automations end-to-end', NULL, 7, true, true, 4, 'ptpl_crm_automation', 'ptplt_crm_3'),
('ptplt_crm_5', 'Train client team', NULL, 8, false, false, 5, 'ptpl_crm_automation', 'ptplt_crm_4');

-- Monthly reporting
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_rep_1', 'Pull performance data', NULL, 0, false, false, 1, 'ptpl_monthly_reporting', NULL),
('ptplt_rep_2', 'Build report', NULL, 1, false, false, 2, 'ptpl_monthly_reporting', 'ptplt_rep_1'),
('ptplt_rep_3', 'Internal QA review of report', NULL, 2, true, true, 3, 'ptpl_monthly_reporting', 'ptplt_rep_2'),
('ptplt_rep_4', 'Send report to client', NULL, 3, false, false, 4, 'ptpl_monthly_reporting', 'ptplt_rep_3');

-- Client offboarding
INSERT INTO "ProjectTemplateTask" ("id", "title", "description", "dueDateOffsetDays", "isQualityControl", "requiresEvidence", "order", "templateId", "dependsOnId") VALUES
('ptplt_off_1', 'Confirm offboarding reason and final date', NULL, 0, false, false, 1, 'ptpl_client_offboarding', NULL),
('ptplt_off_2', 'Export and hand off assets (files, credentials, reports)', NULL, 3, false, false, 2, 'ptpl_client_offboarding', 'ptplt_off_1'),
('ptplt_off_3', 'Cancel recurring billing and services', NULL, 3, false, false, 3, 'ptpl_client_offboarding', 'ptplt_off_1'),
('ptplt_off_4', 'Send final summary and exit survey', NULL, 5, false, false, 4, 'ptpl_client_offboarding', 'ptplt_off_2'),
('ptplt_off_5', 'Archive client record', NULL, 7, true, false, 5, 'ptpl_client_offboarding', 'ptplt_off_4');
