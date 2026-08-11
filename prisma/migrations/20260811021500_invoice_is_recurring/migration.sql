-- Distinguishes recurring (subscription) invoices from one-time invoices so
-- "one-time revenue collected" and "recurring revenue collected" can be
-- computed as real, separate figures instead of guessed. Defaults to false
-- for all existing rows — there's no reliable way to backfill this for
-- invoices entered before this column existed without calling out to
-- Stripe per-row, which a migration shouldn't do; going forward it's set
-- automatically by the Stripe sync. Documented as a known limitation.
ALTER TABLE "Invoice" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
