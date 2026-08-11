-- Corrects the previous migration's design: a booking manage link needs to
-- be reusable across the confirmation, reminder, and reschedule emails
-- sent over a booking's lifetime, which a hash-only (write-once) column
-- can't support without storing the raw token somewhere anyway. Renaming
-- rather than dropping/recreating preserves the column's uniqueness and
-- (still-empty, since no booking has used it yet) data.
ALTER TABLE "Booking" RENAME COLUMN "manageTokenHash" TO "manageToken";
ALTER INDEX "Booking_manageTokenHash_key" RENAME TO "Booking_manageToken_key";
