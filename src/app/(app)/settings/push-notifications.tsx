"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { subscribeToPush, unsubscribeFromPush, sendTestPushNotification } from "./actions";

type Device = {
  id: string;
  endpoint: string;
  label: string;
  addedLabel: string;
};

// applicationServerKey needs to be a Uint8Array, but VAPID public keys are
// handed out URL-safe base64 — this is the standard conversion (see the
// web-push docs' own client-side example).
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Whether this browser supports push at all, and its current Notification
// permission, are both plain synchronous reads of browser globals that
// don't exist during server rendering. useSyncExternalStore is the
// React-sanctioned way to read a value like that without a hydration
// mismatch — getServerSnapshot supplies the safe SSR default, and the
// real value takes over right after hydration, with no effect/setState
// pair needed. Neither actually changes on its own after mount (a
// permission grant/revoke only happens through our own requestPermission()
// call, which triggers a re-render some other way — see enable() below),
// so subscribe is a no-op.
function noopSubscribe() {
  return () => {};
}
function getSupportSnapshot() {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}
function getSupportServerSnapshot() {
  return false;
}
function getPermissionSnapshot(): NotificationPermission {
  return typeof Notification === "undefined" ? "default" : Notification.permission;
}
function getPermissionServerSnapshot(): NotificationPermission {
  return "default";
}

export function PushNotificationSettings({
  vapidPublicKey,
  devices,
}: {
  vapidPublicKey: string | null;
  devices: Device[];
}) {
  const supported = useSyncExternalStore(noopSubscribe, getSupportSnapshot, getSupportServerSnapshot);
  const permission = useSyncExternalStore(noopSubscribe, getPermissionSnapshot, getPermissionServerSnapshot);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setCurrentEndpoint(sub.endpoint);
      })
      .catch(() => {});
  }, [supported]);

  async function enable() {
    setMessage(null);
    if (!vapidPublicKey) {
      setMessage("Push notifications aren't configured on this deployment yet.");
      return;
    }
    try {
      await navigator.serviceWorker.register("/sw.js");
      // .register() can resolve before the worker actually finishes
      // installing/activating — subscribing against that registration too
      // early fails with "no active Service Worker". .ready only resolves
      // once there's a genuinely active worker to subscribe against.
      const registration = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMessage(
          "Notification permission wasn't granted — enable it for this site in your browser settings, then try again."
        );
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setMessage("This browser returned an incomplete subscription — try again.");
        return;
      }

      startTransition(async () => {
        const result = await subscribeToPush({
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          userAgent: navigator.userAgent,
        });
        if (result.error) {
          setMessage(result.error);
        } else {
          setCurrentEndpoint(json.endpoint!);
          setMessage("This device is registered — try “Send a test notification” below.");
        }
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't enable notifications on this device.");
    }
  }

  function remove(device: Device) {
    setMessage(null);
    startTransition(async () => {
      await unsubscribeFromPush(device.id);
      if (device.endpoint === currentEndpoint) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const sub = await registration?.pushManager.getSubscription();
          await sub?.unsubscribe();
        } catch {
          // Best-effort — the DB row is already gone either way.
        }
        setCurrentEndpoint(null);
      }
    });
  }

  function sendTest() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPushNotification();
      setMessage(result.error ?? "Test notification sent — check this device.");
    });
  }

  const alreadyOnThisDevice = devices.some((d) => d.endpoint === currentEndpoint);

  return (
    <div className="space-y-4">
      {supported === false && (
        <p className="text-sm text-zinc-500">
          This browser doesn&apos;t support push notifications. On iPhone/iPad, add this site to
          your Home Screen first (Share → Add to Home Screen) — Safari only allows push for
          installed sites.
        </p>
      )}

      {supported && !vapidPublicKey && (
        <p className="text-sm text-zinc-500">
          Not configured yet — set <code className="font-mono text-xs">VAPID_PUBLIC_KEY</code>,{" "}
          <code className="font-mono text-xs">VAPID_PRIVATE_KEY</code>, and{" "}
          <code className="font-mono text-xs">VAPID_SUBJECT</code> to turn this on.
        </p>
      )}

      {supported && vapidPublicKey && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enable}
            disabled={pending || alreadyOnThisDevice}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
          >
            {alreadyOnThisDevice ? "This device is enabled" : "Enable on this device"}
          </button>
          {devices.length > 0 && (
            <button
              type="button"
              onClick={sendTest}
              disabled={pending}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:opacity-50"
            >
              Send a test notification
            </button>
          )}
          {permission === "denied" && (
            <span className="text-xs text-red-400">
              Blocked — this browser has notifications turned off for this site.
            </span>
          )}
        </div>
      )}

      {message && (
        <p className="text-sm text-zinc-400" aria-live="polite">
          {message}
        </p>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No devices registered yet. Enable notifications above on every phone/computer you want
          alerts on.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-zinc-200">
                  {device.label}
                  {device.endpoint === currentEndpoint && (
                    <span className="ml-2 text-xs text-emerald-400">This device</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">Added {device.addedLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(device)}
                disabled={pending}
                className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
