/* ReplyPilot service worker — WP8 push + WP15 minimal shell cache.
 * SINGLE registration at /push-sw.js. Do not add a second SW.
 * Offline draft queue lives in the page (IndexedDB); SW only nudges sync.
 * Never auto-publish. Never cache Convex API / WebSocket responses.
 */

const SHELL_CACHE = "replypilot-shell-v1";
const SHELL_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("replypilot-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Cache-first for allowlisted static shell assets only. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Convex / API / Next data / RSC — stale risk.
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("convex.cloud") ||
    url.hostname.includes("convex.site") ||
    url.pathname.includes("_next/data")
  ) {
    return;
  }

  const isShellAsset =
    SHELL_URLS.includes(url.pathname) ||
    url.pathname.startsWith("/icons/");

  if (!isShellAsset) return;

  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })
  );
});

/** Nudge clients to flush the offline draft queue (page owns IndexedDB). */
function notifyClientsToSyncDrafts() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "replypilot-sync-drafts" });
    }
  });
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && typeof data === "object" && data.type === "replypilot-sync-drafts") {
    event.waitUntil(notifyClientsToSyncDrafts());
  }
});

// --- WP8 push handlers (must remain intact) ---

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
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url, alertId: payload.alertId, opportunityId: payload.opportunityId },
      tag: payload.alertId || "replypilot-hot-window",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "/feed";
  // Deep links may be relative (/feed?…) so Convex never ships localhost.
  const target = /^https?:\/\//i.test(raw)
    ? raw
    : new URL(raw, self.location.origin).href;
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
