// BibleDesk — Modular Billing & SaaS Adapter
// Supports Stripe Checkout + Webhooks with a zero-friction fallback
// for self-hosters and open-source deployments.
// Uses Railway PostgreSQL via Drizzle ORM.

import { getDb } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

export async function createBillingCheckoutSession(options: CheckoutSessionOptions): Promise<{ url: string; mode: 'stripe' | 'mock' }> {
  const { userId, userEmail, tier, interval = 'month', successUrl, cancelUrl } = options;

  if (!isStripeConfigured()) {
    console.log(`[billing] STRIPE_SECRET_KEY is unset; activating mock/self-hosted tier upgrade for user ${userId}`);
    const db = await getDb();
    await db
      .insert(profiles)
      .values({
        id: userId,
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

    return {
      url: `${successUrl}?session=mock_success&tier=${tier}`,
      mode: 'mock',
    };
  }

  try {
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
      metadata: { userId, tier },
    });

    return { url: session.url || successUrl, mode: 'stripe' };
  } catch (err: any) {
    console.error('[billing] Stripe checkout session error:', err);
    throw new Error(err.message || 'Failed to initialize payment gateway');
  }
}

export async function handleStripeWebhookEvent(event: any): Promise<void> {
  const db = await getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const tier = session.metadata?.tier || 'pro';
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (userId) {
        await db
          .insert(profiles)
          .values({
            id: userId,
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionCurrentPeriodEnd: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              subscriptionTier: tier,
              subscriptionStatus: 'active',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionCurrentPeriodEnd: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
            },
          });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      if (customerId) {
        await db
          .update(profiles)
          .set({
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
          })
          .where(eq(profiles.stripeCustomerId, customerId));
      }
      break;
    }

    default:
      console.log(`[billing] Unhandled Stripe event: ${event.type}`);
  }
}

export interface BillingPortalOptions {
  userId: string;
  returnUrl: string;
}

export async function createBillingPortalSession(options: BillingPortalOptions): Promise<{ url: string; mode: 'stripe' | 'mock' }> {
  const { userId, returnUrl } = options;

  if (!isStripeConfigured()) {
    console.log(`[billing] STRIPE_SECRET_KEY is unset; returning mock billing portal for user ${userId}`);
    return { url: `${returnUrl}?session=mock_portal`, mode: 'mock' };
  }

  const db = await getDb();
  const rows = await db
    .select({ stripeCustomerId: profiles.stripeCustomerId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const profile = rows[0];
  if (!profile?.stripeCustomerId) {
    throw new Error('No active billing customer found for this account. Please subscribe first.');
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url, mode: 'stripe' };
  } catch (err: any) {
    console.error('[billing] Stripe portal session creation error:', err);
    throw new Error(err.message || 'Failed to create billing portal session');
  }
}
