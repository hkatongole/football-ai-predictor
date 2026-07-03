import Stripe from 'stripe';
import 'dotenv/config';

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — subscription checkout is disabled until configured.');
}

export function isStripeConfigured() {
  return !!stripe;
}

/**
 * Creates a Stripe Checkout session for a subscription plan.
 * `priceId` is a Stripe Price ID (recurring), configured per SubscriptionPlan
 * in the admin panel (SubscriptionPlan.features.stripePriceId) or via env
 * for a single default plan.
 */
export async function createCheckoutSession({ priceId, userId, planId, userEmail, successUrl, cancelUrl }) {
  if (!stripe) throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY)');

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
    client_reference_id: String(userId),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId), planId: String(planId) },
  });
}

/** Fetches a Stripe subscription (used to read the actual current_period_end for accurate expiry). */
export async function retrieveSubscription(subscriptionId) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.subscriptions.retrieve(subscriptionId);
}

/** Verifies and parses an incoming Stripe webhook request. */
export function constructWebhookEvent(rawBody, signature) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

export default stripe;
