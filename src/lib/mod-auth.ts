import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase';

export interface ActiveModerator {
  id: string;
  role: 'moderator' | 'admin' | string;
  active: boolean;
  user_id?: string;
}

export async function getActiveModerator(req: NextRequest): Promise<ActiveModerator | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) return null;

  const svc = getServerClient();
  const { data: mod } = await svc
    .from('moderators')
    .select('id, role, active, user_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .single();

  return (mod as ActiveModerator | null) ?? null;
}
