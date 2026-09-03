import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const { error } = await getServerClient()
      .from('google_connections')
      .delete()
      .eq('owner_id', user.id);
    if (error) throw new Error(`Unable to disconnect Google account: ${error.message}`);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/google/disconnect');
  }
}

