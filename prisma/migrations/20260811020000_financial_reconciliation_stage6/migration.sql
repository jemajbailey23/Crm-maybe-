-- Stage 6: Financial Accuracy and Stripe Reconciliation.
-- Purely additive — no existing columns/tables are altered or dropped, no
-- existing data is touched.

CREATE TABLE "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FailedPayment" (
  "id" TEXT NOT NULL,
  "stripeChargeId" TEXT,
  "stripeInvoiceId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactId" TEXT,
  CONSTRAINT "FailedPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FailedPayment_stripeChargeId_key" ON "FailedPayment"("stripeChargeId");
CREATE INDEX "FailedPayment_contactId_idx" ON "FailedPayment"("contactId");
CREATE INDEX "FailedPayment_occurredAt_idx" ON "FailedPayment"("occurredAt");
ALTER TABLE "FailedPayment"
  ADD CONSTRAINT "FailedPayment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "MrrEventType" AS ENUM ('NEW', 'EXPANSION', 'CONTRACTION', 'CHURN');

CREATE TABLE "ServiceMrrEvent" (
  "id" TEXT NOT NULL,
  "type" "MrrEventType" NOT NULL,
  "amountDelta" DOUBLE PRECISION NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "ServiceMrrEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServiceMrrEvent_serviceId_idx" ON "ServiceMrrEvent"("serviceId");
CREATE INDEX "ServiceMrrEvent_occurredAt_idx" ON "ServiceMrrEvent"("occurredAt");
ALTER TABLE "ServiceMrrEvent"
  ADD CONSTRAINT "ServiceMrrEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ReconciliationAlertType" AS ENUM (
  'STRIPE_PAYMENT_WITHOUT_INVOICE', 'INVOICE_PAID_WITHOUT_PAYMENT',
  'REFUND_WITHOUT_TRANSACTION', 'DUPLICATE_EXTERNAL_ID',
  'SUBSCRIPTION_STATUS_MISMATCH', 'DASHBOARD_TOTAL_MISMATCH'
);
CREATE TYPE "ReconciliationAlertStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

CREATE TABLE "ReconciliationAlert" (
  "id" TEXT NOT NULL,
  "type" "ReconciliationAlertType" NOT NULL,
  "status" "ReconciliationAlertStatus" NOT NULL DEFAULT 'OPEN',
  "message" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "contactId" TEXT,
  "invoiceId" TEXT,
  CONSTRAINT "ReconciliationAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReconciliationAlert_dedupeKey_key" ON "ReconciliationAlert"("dedupeKey");
CREATE INDEX "ReconciliationAlert_status_idx" ON "ReconciliationAlert"("status");
ALTER TABLE "ReconciliationAlert"
  ADD CONSTRAINT "ReconciliationAlert_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ReconciliationAlert_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
