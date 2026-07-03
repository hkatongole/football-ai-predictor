import prisma from '../config/prisma.js';
import { sendPushToMany, isPushConfigured } from '../services/pushService.js';
import { ApiError } from '../middleware/errorHandler.js';

export function getVapidPublicKey(_req, res) {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null, configured: isPushConfigured() });
}

/** Body: { endpoint, keys: { p256dh, auth } } — standard PushSubscription.toJSON() shape */
export async function subscribe(req, res, next) {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new ApiError(400, 'endpoint and keys.p256dh/keys.auth are required');
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user?.id ?? null, userAgent: req.headers['user-agent'] },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: req.user?.id ?? null, userAgent: req.headers['user-agent'] },
    });

    res.status(201).json({ success: true, data: { id: subscription.id } });
  } catch (err) { next(err); }
}

export async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    if (!endpoint) throw new ApiError(400, 'endpoint is required');
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ success: true, message: 'Unsubscribed' });
  } catch (err) { next(err); }
}

/** GET /notifications — a user's own in-app notification feed */
export async function myNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    await prisma.notification.update({ where: { id: Number(req.params.id) }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/**
 * ADMIN: dispatch a push notification, optionally to all users or a single user.
 * Body: { title, body, type, userId?, data? }
 * Always writes to the Notification table (in-app feed) and, if VAPID is
 * configured, also pushes to matching PushSubscription rows.
 */
export async function dispatch(req, res, next) {
  try {
    const { title, body, type = 'ADMIN', userId, data } = req.body;
    if (!title || !body) throw new ApiError(400, 'title and body are required');

    const notification = await prisma.notification.create({
      data: { title, body, type, data, userId: userId ?? null },
    });

    const subscriptions = await prisma.pushSubscription.findMany({
      where: userId ? { userId: Number(userId) } : {},
    });

    let pushResult = { sent: 0, failed: 0, deadSubscriptionIds: [] };
    if (isPushConfigured() && subscriptions.length) {
      pushResult = await sendPushToMany(subscriptions, { title, body, data, type });
      if (pushResult.deadSubscriptionIds.length) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: pushResult.deadSubscriptionIds } } });
      }
    }

    res.status(201).json({
      success: true,
      data: { notification, pushConfigured: isPushConfigured(), targetedSubscriptions: subscriptions.length, ...pushResult },
    });
  } catch (err) { next(err); }
}
