-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "stripeInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_stripeCustomerId_key" ON "Contact"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");
