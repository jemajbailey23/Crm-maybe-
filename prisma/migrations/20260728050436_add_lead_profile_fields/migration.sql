-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'SMS';
ALTER TYPE "ActivityType" ADD VALUE 'FACEBOOK_MESSAGE';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "address" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "closingProbability" INTEGER,
ADD COLUMN     "competitors" TEXT,
ADD COLUMN     "currentProblems" TEXT,
ADD COLUMN     "desiredOutcome" TEXT,
ADD COLUMN     "estimatedDealValue" DOUBLE PRECISION,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "googleBusinessProfile" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "leadScore" INTEGER,
ADD COLUMN     "leadSource" TEXT,
ADD COLUMN     "monthlyValue" DOUBLE PRECISION,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "pipelineStage" "DealStage" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
