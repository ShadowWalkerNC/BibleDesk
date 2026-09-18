// BibleDesk — Modular Billing & SaaS Adapter
// Supports Stripe Checkout + Webhooks with a zero-friction fallback
// for self-hosters and open-source deployments.

import { getServerClient } from '@/lib/supabase';
import type { SubscriptionTier } from '@/lib/tiers';

export interface CheckoutSessionOptions {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  interval?: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Creates a checkout session URL or activates instant tier upgrade in mock/self-hosted mode.
 */
export async function createBillingCheckoutSession(options: CheckoutSessionOptions): Promise<{ url: string; mode: 'stripe' | 'mock' }> {
  const { userId, userEmail, tier, interval = 'month', successUrl, cancelUrl } = options;

  // 1. If Stripe is NOT configured, support turnkey mock / self-hosted mode
  if (!isStripeConfigured()) {
    console.log(`[billing] STRIPE_SECRET_KEY is unset; activating mock/self-hosted tier upgrade for user ${userId}`);
    const client = getServerClient();
    await client
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', userId);

    return {
      url: `${successUrl}?session=mock_success&tier=${tier}`,
      mode: 'mock',
    };
  }

  // 2. Stripe Integration (when configured)
  try {
    // Dynamic import to prevent build errors if stripe package is optional
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const prices: Record<SubscriptionTier, { month: number; year: number }> = {
      free: { month: 0, year: 0 },
      pro: { month: 700, year: 6000 },
      ministry: { month: 1900, year: 18000 },
      lifetime: { month: 0, year: 19900 },
    };

    const unitAmount = interval === 'year' ? prices[tier].year : prices[tier].month;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `BibleDesk ${tier.toUpperCase()} Membership`,
              description: `Hosted 5D AI assistance, real-time cloud sync, and deep study tools.`,
            },
            unit_amount: unitAmount,
            recurring: tier === 'lifetime' ? undefined : { interval },
          },
          quantity: 1,
        },
      ],
      mode: tier === 'lifetime' ? 'payment' : 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
      },
    });

    return {
      url: session.url || successUrl,
      mode: 'stripe',
    };
  } catch (err: any) {
    console.error('[billing] Stripe checkout session error:', err);
    throw new Error(err.message || 'Failed to initialize payment gateway');
  }
}

/**
 * Syncs Stripe subscription webhook events to Supabase user profiles.
 */
export async function handleStripeWebhookEvent(event: any): Promise<void> {
  const client = getServerClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const tier = session.metadata?.tier || 'pro';
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (userId) {
        await client
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_current_period_end: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      if (customerId) {
        await client
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
          })
          .eq('stripe_customer_id', customerId);
      }
      break;
    }

    default:
      console.log(`[billing] Unhandled Stripe event: ${event.type}`);
  }
}
