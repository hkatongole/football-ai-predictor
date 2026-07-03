import webpush from 'web-push';
import 'dotenv/config';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SMTP_FROM } = process.env;

let configured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${SMTP_FROM?.match(/<(.+)>/)?.[1] || 'admin@footballai.app'}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
} else {
  console.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled. Run `npm run generate-vapid` and add the keys to .env.');
}

export function isPushConfigured() {
  return configured;
}

/**
 * Sends a push notification to a single stored subscription. Automatically
 * signals the caller (via the thrown error's statusCode) when a subscription
 * is dead (410 Gone / 404) so it can be pruned from the database.
 */
export async function sendPush(subscription, payload) {
  if (!configured) throw new Error('Push notifications are not configured (missing VAPID keys)');

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  return webpush.sendNotification(pushSubscription, JSON.stringify(payload));
}

/**
 * Sends to many subscriptions in parallel, returning which ones are dead
 * (so the caller can delete them) and how many succeeded.
 */
export async function sendPushToMany(subscriptions, payload) {
  const results = await Promise.allSettled(subscriptions.map((s) => sendPush(s, payload)));

  const dead = [];
  let sent = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') sent += 1;
    else if (r.reason?.statusCode === 404 || r.reason?.statusCode === 410) dead.push(subscriptions[i].id);
  });

  return { sent, failed: results.length - sent, deadSubscriptionIds: dead };
}
