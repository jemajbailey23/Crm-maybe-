-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('LEAD', 'CLIENT');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "status" "ContactStatus" NOT NULL DEFAULT 'LEAD';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wonAt" TIMESTAMP(3);
