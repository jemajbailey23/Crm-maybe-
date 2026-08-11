// Push notification service worker for Bailey Ventures Digital CRM.
//
// Served as a static file directly at /sw.js (Next.js serves everything
// under public/ from the root) — there's no build step for this file, so
// keep it plain, widely-supported JS rather than anything TypeScript- or
// bundler-only.
//
// This worker does exactly two things: show a notification when a push
// arrives, and focus/open the app when that notification is clicked. All
// the actual subscribe/unsubscribe/device-management logic lives in
// settings/push-notifications.tsx — this file only needs to exist and be
// registered for the browser to have somewhere to deliver pushes to.

self.addEventListener("push", (event) => {
  let data = { title: "Bailey Ventures Digital CRM", body: "" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      // Not JSON — fall back to showing whatever text arrived rather than
      // dropping the notification.
      data = { title: "Bailey Ventures Digital CRM", body: event.data.text() };
    }
  }

  const title = data.title || "Bailey Ventures Digital CRM";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Reuse an already-open tab if one exists instead of always opening
      // a new one.
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((c) => c && c.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
