import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

// Lightweight browser/OS guess from the User-Agent string captured at
// subscribe time — not exhaustive, just enough to tell devices apart in
// the short list Settings shows ("Chrome on macOS" vs. "Safari on iOS").
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

// setVapidDetails only needs to run once per process, not once per send.
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    // Same "fail loudly instead of silently no-op-ing" philosophy as
    // mail.ts's isMailConfigured() check — a push automation action that
    // quietly never notifies anyone should never read as "Success".
    throw new Error(
      "Push notification not sent — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT aren't configured"
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  // Opened when the notification itself is clicked — see public/sw.js.
  url?: string;
};

export type PushSendResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; subscriptionId: string; error: string; pruned: boolean };

/** Sends one push notification to every device the given user has
 * registered (Settings > Notifications) — a single owner commonly has a
 * phone and a laptop both subscribed, and both should get the alert.
 *
 * A subscription the push service reports as gone (404/410 — the browser
 * unsubscribed, cleared site data, or the endpoint expired) is pruned from
 * the DB automatically; there's nothing to recover, the browser would
 * issue a fresh one on next subscribe.
 *
 * Throws only when every device failed (mirrors sendAutomationEmail's
 * behavior) — callers that want the per-device detail (the "send test
 * notification" button, the automation engine) get it back in the
 * resolved array either way. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushSendResult[]> {
  ensureVapidConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) {
    throw new Error("No devices registered for push notifications — add one in Settings > Notifications");
  }

  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subscriptions.map(async (sub): Promise<PushSendResult> => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
        return { ok: true, subscriptionId: sub.id };
      } catch (err) {
        const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined;
        const pruned = statusCode === 404 || statusCode === 410;
        if (pruned) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {
            // Already gone (e.g. removed from Settings concurrently) — fine.
          });
        }
        return {
          ok: false,
          subscriptionId: sub.id,
          error: err instanceof Error ? err.message : "Unknown error",
          pruned,
        };
      }
    })
  );

  if (results.every((r) => !r.ok)) {
    const firstError = results.find((r): r is Extract<PushSendResult, { ok: false }> => !r.ok);
    throw new Error(firstError?.error ?? "Push notification failed on every registered device");
  }

  return results;
}
