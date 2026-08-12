-- Onboarding form becomes a multi-step wizard: expanded Business Info
-- fields, Brand Assets (voice/description text + uploaded files).

ALTER TABLE "Contact" ADD COLUMN "legalBusinessName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "serviceAreas" TEXT;
ALTER TABLE "Contact" ADD COLUMN "yearsInBusiness" TEXT;
ALTER TABLE "Contact" ADD COLUMN "businessHours" TEXT;
ALTER TABLE "Contact" ADD COLUMN "preferredContactMethod" TEXT;

ALTER TABLE "Contact" ADD COLUMN "brandVoice" TEXT;
ALTER TABLE "Contact" ADD COLUMN "brandDescription" TEXT;
ALTER TABLE "Contact" ADD COLUMN "brandDifferentiators" TEXT;
ALTER TABLE "Contact" ADD COLUMN "brandAvoidWords" TEXT;

-- CreateEnum
CREATE TYPE "BrandAssetSlot" AS ENUM ('PRIMARY_LOGO', 'ALTERNATE_LOGO', 'BRAND_GUIDELINES', 'BUSINESS_PHOTOS', 'TEAM_PHOTOS', 'PRODUCT_PHOTOS', 'VIDEO_ASSETS');

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "slot" "BrandAssetSlot" NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandAsset_contactId_idx" ON "BrandAsset"("contactId");

ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
