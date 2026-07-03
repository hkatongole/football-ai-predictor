import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Manages the browser Push subscription lifecycle: permission request,
 * subscribe (registers with the backend at /notifications/subscribe),
 * and unsubscribe. Requires VITE_VAPID_PUBLIC_KEY to match the backend's
 * VAPID_PUBLIC_KEY (see backend `npm run generate-vapid`).
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [supported] = useState('serviceWorker' in navigator && 'PushManager' in window);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    })();
  }, [supported]);

  const subscribe = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Push notifications are not configured (missing VITE_VAPID_PUBLIC_KEY).');

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Notification permission was not granted.');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/notifications/subscribe', subscription.toJSON());
      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
