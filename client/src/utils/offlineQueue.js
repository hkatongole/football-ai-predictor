/**
 * Queues a write request (e.g. "favorite this team") in IndexedDB when the
 * network is unavailable, and registers a Background Sync tag so the
 * service worker (see src/sw.js, 'sync' listener) replays it once
 * connectivity returns.
 *
 * Usage:
 *   try {
 *     await api.post('/favorites', body);
 *   } catch (err) {
 *     if (!navigator.onLine) await queueOfflineRequest({ url: '/api/v1/favorites', method: 'POST', body });
 *     else throw err;
 *   }
 */
const DB_NAME = 'football-ai-offline';
const STORE_NAME = 'favorites-queue';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineRequest({ url, method = 'POST', headers = { 'Content-Type': 'application/json' }, body }) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ url, method, headers, body: JSON.stringify(body) });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-favorites');
  }
}
