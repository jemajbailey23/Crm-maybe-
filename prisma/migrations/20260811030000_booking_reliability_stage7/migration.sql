-- Stage 7: Booking Reliability.
-- Additive except for two backfilled NOT NULL columns on the existing
-- Booking table (bufferedStartsAt/bufferedEndsAt, timezone) — both are
-- backfilled from existing data before being made required, so no existing
-- booking row is lost or invalidated.

-- 1. Meeting types ----------------------------------------------------

CREATE TABLE "MeetingType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "weeklyAvailability" JSONB,
  "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
  "minNoticeHours" INTEGER NOT NULL DEFAULT 12,
  "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
  "intakeQuestions" JSONB,
  "confirmationSubject" TEXT,
  "confirmationBody" TEXT,
  "reminderHoursBefore" JSONB,
  "cancellationPolicy" TEXT,
  "minCancelNoticeHours" INTEGER,
  "allowRescheduling" BOOLEAN NOT NULL DEFAULT true,
  "relatedDealStage" "DealStage",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MeetingType_slug_key" ON "MeetingType"("slug");

-- 2. Booking: status + new relations/tracking columns -----------------

CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED');

ALTER TABLE "Booking"
  ADD COLUMN "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "intakeAnswers" JSONB,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "manageTokenHash" TEXT,
  ADD COLUMN "confirmationSentAt" TIMESTAMP(3),
  ADD COLUMN "internalNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "remindersSent" JSONB,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "noShowAt" TIMESTAMP(3),
  ADD COLUMN "rescheduledFromId" TEXT,
  ADD COLUMN "meetingTypeId" TEXT,
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "dealId" TEXT,
  ADD COLUMN "bufferedStartsAt" TIMESTAMP(3),
  ADD COLUMN "bufferedEndsAt" TIMESTAMP(3);

-- Backfill: existing bookings had no buffers, so their buffered range is
-- just their own start/end. Existing bookings also predate per-visitor
-- timezone capture — backfilled from the owner's current booking timezone
-- (the best available approximation; there's no way to recover what the
-- visitor's browser actually reported at the time).
UPDATE "Booking" SET "bufferedStartsAt" = "startsAt", "bufferedEndsAt" = "endsAt";
ALTER TABLE "Booking" ADD COLUMN "timezone" TEXT;
UPDATE "Booking" SET "timezone" = COALESCE((SELECT "bookingTimezone" FROM "User" LIMIT 1), 'America/New_York');
ALTER TABLE "Booking"
  ALTER COLUMN "bufferedStartsAt" SET NOT NULL,
  ALTER COLUMN "bufferedEndsAt" SET NOT NULL,
  ALTER COLUMN "timezone" SET NOT NULL;

CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE UNIQUE INDEX "Booking_manageTokenHash_key" ON "Booking"("manageTokenHash");
CREATE UNIQUE INDEX "Booking_rescheduledFromId_key" ON "Booking"("rescheduledFromId");
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Booking_meetingTypeId_fkey" FOREIGN KEY ("meetingTypeId") REFERENCES "MeetingType"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Booking_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Booking logs -------------------------------------------------------

CREATE TYPE "BookingLogType" AS ENUM ('CONFIRMATION_SENT', 'REMINDER_SENT', 'DELIVERY_FAILED', 'BOOKING_CONFLICT', 'DUPLICATE_PREVENTED');

CREATE TABLE "BookingLog" (
  "id" TEXT NOT NULL,
  "type" "BookingLogType" NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bookingId" TEXT,
  CONSTRAINT "BookingLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BookingLog_type_createdAt_idx" ON "BookingLog"("type", "createdAt");
ALTER TABLE "BookingLog"
  ADD CONSTRAINT "BookingLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Branded booking URL -------------------------------------------------

ALTER TABLE "User" ADD COLUMN "bookingBrandedUrl" TEXT;

-- 5. New automation triggers ---------------------------------------------

ALTER TYPE "AutomationTrigger" ADD VALUE 'APPOINTMENT_RESCHEDULED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'APPOINTMENT_CANCELLED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'APPOINTMENT_COMPLETED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'APPOINTMENT_NO_SHOW';
