-- AlterTable
ALTER TABLE "User" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT 'indigo',
ADD COLUMN     "defaultLandingPage" TEXT NOT NULL DEFAULT '/dashboard';

-- CreateTable
CREATE TABLE "PipelineStageLabel" (
    "id" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "PipelineStageLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLabelPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLabelPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStageLabel_stage_key" ON "PipelineStageLabel"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLabelPreset_name_key" ON "TaskLabelPreset"("name");
