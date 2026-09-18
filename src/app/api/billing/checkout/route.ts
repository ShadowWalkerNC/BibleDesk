import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createBillingCheckoutSession } from '@/lib/billing';
import type { SubscriptionTier } from '@/lib/tiers';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to subscribe' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const tier = (body.tier as SubscriptionTier) || 'pro';
    const interval = (body.interval as 'month' | 'year') || 'month';

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${origin}/pricing`;
    const cancelUrl = `${origin}/pricing`;

    const result = await createBillingCheckoutSession({
      userId: user.id,
      userEmail: user.email || '',
      tier,
      interval,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      mode: result.mode,
    });
  } catch (err: any) {
    console.error('[api/billing/checkout] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Billing initialization failed' },
      { status: 500 }
    );
  }
}
