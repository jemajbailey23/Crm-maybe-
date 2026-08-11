import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Exercises the exact idempotency mechanism api/webhooks/stripe/route.ts
// relies on: prisma.stripeEvent.create() guarded by the unique constraint
// on StripeEvent.id. This is a real-database test (not a mock) because the
// whole point of the guard is a DB-level unique constraint — a mock
// wouldn't prove the constraint actually exists and is enforced.
const eventId = `evt_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

afterAll(async () => {
  await prisma.stripeEvent.deleteMany({ where: { id: eventId } });
});

async function recordEventOrDetectDuplicate(id: string, type: string): Promise<"processed" | "duplicate"> {
  try {
    await prisma.stripeEvent.create({ data: { id, type } });
    return "processed";
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return "duplicate";
    }
    throw err;
  }
}

describe("Stripe webhook event idempotency (duplicate delivery)", () => {
  it("processes the first delivery of an event", async () => {
    const result = await recordEventOrDetectDuplicate(eventId, "invoice.paid");
    expect(result).toBe("processed");
  });

  it("detects a redelivery of the exact same event as a duplicate", async () => {
    const result = await recordEventOrDetectDuplicate(eventId, "invoice.paid");
    expect(result).toBe("duplicate");
  });

  it("still only has one StripeEvent row on record after multiple redeliveries", async () => {
    await recordEventOrDetectDuplicate(eventId, "invoice.paid");
    await recordEventOrDetectDuplicate(eventId, "invoice.paid");
    const rows = await prisma.stripeEvent.findMany({ where: { id: eventId } });
    expect(rows).toHaveLength(1);
  });

  it("a different event ID is processed independently, not blocked by the first", async () => {
    const otherId = `${eventId}_other`;
    const result = await recordEventOrDetectDuplicate(otherId, "invoice.payment_failed");
    expect(result).toBe("processed");
    await prisma.stripeEvent.deleteMany({ where: { id: otherId } });
  });
});
