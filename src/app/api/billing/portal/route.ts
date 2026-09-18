import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createBillingPortalSession } from '@/lib/billing';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to access billing portal' },
        { status: 401 }
      );
    }

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/pricing`;

    const result = await createBillingPortalSession({
      userId: user.id,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      mode: result.mode,
    });
  } catch (err: any) {
    console.error('[api/billing/portal] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Billing portal initialization failed' },
      { status: 500 }
    );
  }
}
