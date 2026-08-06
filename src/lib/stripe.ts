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

// Available + pending balance across all currencies Stripe holds for this
// account, in dollars. Returns null (instead of throwing) when Stripe isn't
// configured or the API call fails, so callers can just skip rendering it.
export async function getStripeBalance() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const balance = await getStripeClient().balance.retrieve();
    const sum = (entries: { amount: number; currency: string }[]) =>
      entries.reduce((total, entry) => total + entry.amount, 0) / 100;
    return {
      available: sum(balance.available),
      pending: sum(balance.pending),
      currency: balance.available[0]?.currency ?? "usd",
    };
  } catch (err) {
    console.error("[stripe] failed to retrieve balance", err);
    return null;
  }
}
