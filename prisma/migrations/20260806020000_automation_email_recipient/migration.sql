-- CreateEnum
CREATE TYPE "AutomationEmailRecipient" AS ENUM ('OWNER', 'CONTACT');

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "emailRecipient" "AutomationEmailRecipient" NOT NULL DEFAULT 'OWNER';

-- Preserve existing behavior: the booking confirmation email sent to
-- visitors used to be hardcoded into the booking flow itself, outside the
-- automation system entirely. Now that a SEND_EMAIL action can target the
-- contact, seed a rule that reproduces the exact same message so nothing
-- stops working for anyone already relying on it — it's just editable (or
-- disable-able) from the Automations page from here on.
INSERT INTO "AutomationRule"
  (id, name, trigger, "actionType", enabled, "emailRecipient", "emailSubject", "emailBody", "createdAt", "updatedAt")
VALUES
  (
    'automation_seed_booking_confirmation',
    'Booking confirmation to client',
    'APPOINTMENT_BOOKED',
    'SEND_EMAIL',
    true,
    'CONTACT',
    'Your call is confirmed',
    'Hi {{name}},

Your call is confirmed for {{date}}. See you then!',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;
