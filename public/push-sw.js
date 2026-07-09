/* ReplyPilot push service worker — hot-window alerts only (WP8, not full PWA). */

self.addEventListener("push", (event) => {
  let payload = { title: "ReplyPilot", body: "New hot-window alert", url: "/feed" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // Keep defaults when payload is malformed.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/next.svg",
      badge: "/next.svg",
      data: { url: payload.url, alertId: payload.alertId, opportunityId: payload.opportunityId },
      tag: payload.alertId || "replypilot-hot-window",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/feed";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    })
  );
});
