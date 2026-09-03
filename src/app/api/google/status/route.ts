import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const { data, error } = await getServerClient()
      .from('google_connections')
      .select('google_account_email, scopes, created_at, updated_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Unable to read Google connection status: ${error.message}`);
    return NextResponse.json({
      connected: Boolean(data),
      accountEmail: data?.google_account_email ?? null,
      scopes: data?.scopes ?? [],
      connectedAt: data?.created_at ?? null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'GET /api/google/status');
  }
}

