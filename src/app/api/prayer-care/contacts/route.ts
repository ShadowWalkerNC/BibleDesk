import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { parseContactInput } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const { data, error } = await getServerClient()
      .from('prayer_contacts')
      .select('id, display_name, email, phone, category, is_sensitive, is_archived, created_at, updated_at')
      .eq('owner_id', user.id)
      .eq('is_archived', false)
      .order('display_name');
    if (error) throw new Error(`Unable to list prayer contacts: ${error.message}`);
    return NextResponse.json({ contacts: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error, 'GET /api/prayer-care/contacts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const input = parseContactInput(await request.json());
    const { data, error } = await getServerClient()
      .from('prayer_contacts')
      .insert({
        owner_id: user.id,
        display_name: input.displayName,
        email: input.email,
        phone: input.phone,
        category: input.category,
        is_sensitive: input.isSensitive,
      })
      .select('id, display_name, email, phone, category, is_sensitive, is_archived, created_at, updated_at')
      .single();
    if (error) throw new Error(`Unable to create prayer contact: ${error.message}`);
    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/contacts');
  }
}

