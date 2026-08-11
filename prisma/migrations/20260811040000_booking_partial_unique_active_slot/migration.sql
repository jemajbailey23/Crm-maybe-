-- Bugfix: Booking.startsAt was globally @unique, so a cancelled or
-- rescheduled booking's row (kept for history, never deleted) permanently
-- blocked its exact instant from ever being booked again — the slot
-- picker correctly listed it as free (it filters out CANCELLED/
-- RESCHEDULED bookings), but the actual insert would fail with a unique
-- violation the moment anyone tried to take it, misreported as "someone
-- else just booked that time."
--
-- Replaces the unconditional unique index with a partial one that only
-- applies to bookings that currently hold their slot. Prisma's schema
-- language can't express a conditional/partial unique constraint, so this
-- is unmanaged by @unique in schema.prisma — deliberately, see the
-- comment there.
DROP INDEX "Booking_startsAt_key";

CREATE UNIQUE INDEX "Booking_startsAt_active_key" ON "Booking"("startsAt")
  WHERE "status" NOT IN ('CANCELLED', 'RESCHEDULED');
