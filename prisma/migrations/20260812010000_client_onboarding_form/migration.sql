-- Client-facing onboarding form (sent once a client has paid, or manually)
-- and a dedicated agreement/contract document slot on Contact.

ALTER TABLE "Contact" ADD COLUMN "onboardingFormToken" TEXT;
ALTER TABLE "Contact" ADD COLUMN "onboardingFormSentAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN "onboardingFormSubmittedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Contact_onboardingFormToken_key" ON "Contact"("onboardingFormToken");

ALTER TABLE "Contact" ADD COLUMN "agreementFileUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN "agreementFilename" TEXT;
ALTER TABLE "Contact" ADD COLUMN "agreementPath" TEXT;
ALTER TABLE "Contact" ADD COLUMN "agreementUploadedAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN "agreementSigned" BOOLEAN NOT NULL DEFAULT false;
