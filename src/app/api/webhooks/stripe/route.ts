import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { syncStripeInvoice } from "@/lib/stripe-sync";

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

  try {
    switch (event.type) {
      case "invoice.paid":
        await syncStripeInvoice(event.data.object as Stripe.Invoice, "PAID");
        break;
      case "invoice.finalized":
        await syncStripeInvoice(event.data.object as Stripe.Invoice, "SENT");
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
