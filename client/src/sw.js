import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Injected at build time by vite-plugin-pwa (injectManifest strategy) with
// the list of build assets to precache for offline use.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Match/prediction API responses — serve from network, fall back to cache when offline
registerRoute(
  ({ url }) => /\/api\/v1\/(matches|predictions)/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 10 * 60 })],
  })
);

// Images — cache-first, long-lived
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

/**
 * Push notifications: goals, match start, prediction updates, admin
 * messages, premium tips. Payload shape sent by the backend
 * (see backend/src/services/pushService.js): { title, body, data, type }
 */
self.addEventListener('push', (event) => {
  let payload = { title: 'Football AI Predictor', body: 'You have a new update.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {
    payload.body = event.data?.text() || payload.body;
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
    tag: payload.type || 'general',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

/** Clicking a notification focuses/opens the app, optionally deep-linking to a match. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const matchId = event.notification.data?.matchId;
  const targetUrl = matchId ? `/matches/${matchId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
      } else {
        self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Background Sync: retries queued actions (e.g. "favorite this team" made
 * while offline) once connectivity returns. Pages register a sync tag via
 * `registration.sync.register('sync-favorites')` when a write fails offline;
 * this listener replays anything queued in IndexedDB under that tag.
 * (Queueing helper lives in client/src/utils/offlineQueue.js.)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(replayQueuedRequests('favorites-queue'));
  }
});

async function replayQueuedRequests(storeName) {
  // Minimal, dependency-free IndexedDB replay — see offlineQueue.js for the writer side.
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('football-ai-offline', 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const all = await new Promise((resolve, reject) => {
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

  for (const item of all) {
    try {
      await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
      store.delete(item.id);
    } catch (_e) {
      // still offline or request failed — leave queued for next sync event
    }
  }
}
