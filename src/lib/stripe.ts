import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe isn't configured yet. Set STRIPE_SECRET_KEY."
    );
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
