import prisma from '../config/prisma.js';
import { createCheckoutSession, constructWebhookEvent, isStripeConfigured, retrieveSubscription } from '../services/stripeService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function getPlans(_req, res, next) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } });
    res.json({ success: true, data: plans, stripeConfigured: isStripeConfigured() });
  } catch (err) { next(err); }
}

/** POST /subscriptions/checkout  body: { planId } */
export async function checkout(req, res, next) {
  try {
    if (!isStripeConfigured()) throw new ApiError(503, 'Payments are not configured yet. Set STRIPE_SECRET_KEY.');

    const { planId } = req.body;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: Number(planId) } });
    if (!plan) throw new ApiError(404, 'Plan not found');

    const priceId = plan.features?.stripePriceId;
    if (!priceId) throw new ApiError(400, 'This plan has no Stripe price configured (set features.stripePriceId in the admin panel).');

    const session = await createCheckoutSession({
      priceId,
      userId: req.user.id,
      planId: plan.id,
      userEmail: req.user.email,
      successUrl: `${process.env.CLIENT_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.CLIENT_URL}/premium`,
    });

    res.json({ success: true, checkoutUrl: session.url });
  } catch (err) { next(err); }
}

/**
 * POST /subscriptions/webhook — Stripe webhook receiver.
 * IMPORTANT: this route must receive the raw request body (see app.js,
 * where express.raw() is applied to this specific path BEFORE express.json()).
 */
export async function webhook(req, res) {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      /**
       * A checkout completed. We record the payment AND persist the mapping
       * from Stripe's subscription ID -> our Subscription row, so that a
       * later cancellation event (below) can find the right user without
       * guessing. This is the piece that was previously a stub.
       */
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = Number(session.client_reference_id || session.metadata?.userId);
        const planId = Number(session.metadata?.planId);
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (userId) {
          await prisma.payment.create({
            data: {
              userId,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency?.toUpperCase() || 'USD',
              provider: 'stripe',
              status: 'SUCCESS',
              reference: session.id,
            },
          });

          await prisma.user.update({ where: { id: userId }, data: { isPremium: true } });

          if (planId && stripeSubscriptionId) {
            // Pull the real current_period_end from Stripe rather than guessing a fixed offset.
            let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // sane fallback
            try {
              const stripeSub = await retrieveSubscription(stripeSubscriptionId);
              if (stripeSub?.current_period_end) periodEnd = new Date(stripeSub.current_period_end * 1000);
            } catch (e) {
              console.warn('[stripe webhook] could not retrieve subscription period end, using fallback:', e.message);
            }

            await prisma.subscription.upsert({
              where: { stripeSubscriptionId },
              update: { status: 'ACTIVE', endDate: periodEnd },
              create: {
                userId, planId, stripeSubscriptionId,
                status: 'ACTIVE', startDate: new Date(), endDate: periodEnd,
              },
            });
          }
        }
        break;
      }

      /**
       * Subscription cancelled (either immediately or at period end,
       * depending on how it was cancelled) — look up the Subscription row
       * we created above by Stripe's subscription ID, mark it CANCELLED,
       * and revoke the user's isPremium flag. This replaces the previous
       * log-only stub.
       */
      case 'customer.subscription.deleted': {
        const stripeSubscriptionId = event.data.object.id;
        const localSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });

        if (localSub) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId },
            data: { status: 'CANCELLED', endDate: new Date() },
          });

          // Only revoke premium if the user has no OTHER active subscription
          // (defensive — supports a future multi-plan-per-user scenario).
          const stillActive = await prisma.subscription.findFirst({
            where: { userId: localSub.userId, status: 'ACTIVE', id: { not: localSub.id } },
          });
          if (!stillActive) {
            await prisma.user.update({ where: { id: localSub.userId }, data: { isPremium: false } });
          }
        } else {
          console.warn('[stripe webhook] subscription.deleted for unknown stripeSubscriptionId:', stripeSubscriptionId);
        }
        break;
      }

      /** Handles plans that lapse due to failed payment, not explicit cancellation. */
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const localSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
        if (localSub && ['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
          await prisma.subscription.update({ where: { stripeSubscriptionId: sub.id }, data: { status: 'CANCELLED' } });
          await prisma.user.update({ where: { id: localSub.userId }, data: { isPremium: false } });
        }
        break;
      }

      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    res.status(500).json({ received: false });
  }
}
