-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bookingSlotMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "bookingTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "weeklyAvailability" JSONB;

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
