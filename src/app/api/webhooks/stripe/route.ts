import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import {
  syncStripeInvoice,
  syncStripeRefund,
  syncStripeSubscription,
  syncStripeFailedPayment,
} from "@/lib/stripe-sync";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency guard: record this event's ID before doing anything else.
  // The unique constraint on StripeEvent.id makes this atomic — if two
  // requests for the same redelivered event race each other, only one
  // `create` succeeds and the other hits P2002 below. This is what
  // "Store and enforce unique Stripe event IDs" means in practice: without
  // it, a Stripe retry (timeout, or a manual resend from the dashboard)
  // would re-fire INVOICE_PAID automations and double-record MRR events
  // for a single real-world change.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      console.log("[stripe webhook] duplicate event, skipping", event.id, event.type);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe webhook] failed to record event", event.id, err);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await syncStripeInvoice(event.data.object as Stripe.Invoice, "PAID");
        break;
      case "invoice.finalized":
        await syncStripeInvoice(event.data.object as Stripe.Invoice, "SENT");
        break;
      case "invoice.payment_failed":
        await syncStripeFailedPayment(event.data.object as Stripe.Invoice);
        break;
      case "credit_note.created":
      case "credit_note.updated":
        await syncStripeRefund(event.data.object as Stripe.CreditNote);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    // Log loudly, but still return 200 — retrying a bug in our own code
    // won't fix it, and we don't want Stripe to eventually disable the
    // endpoint after repeated failures.
    console.error("[stripe webhook] failed to process event", event.type, err);
  }

  return NextResponse.json({ received: true });
}
