import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { SAMPLE_CHURCHES, ChurchProfile } from '@/types/church';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const id = searchParams.get('id');

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getServerClient();
      let query = supabase.from('churches').select('*');
      if (code) query = query.eq('invite_code', code.toUpperCase());
      if (id) query = query.eq('id', id);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, churches: data });
      }
    }

    // Fallback: search local sample churches
    let filtered = SAMPLE_CHURCHES;
    if (code) {
      filtered = SAMPLE_CHURCHES.filter(c => c.invite_code.toLowerCase() === code.toLowerCase());
    } else if (id) {
      filtered = SAMPLE_CHURCHES.filter(c => c.id === id);
    }

    return NextResponse.json({ success: true, churches: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, denomination, city, state_province, country, website, contact_email, phone } = body;

    if (!name || !contact_email) {
      return NextResponse.json({ error: 'Church name and contact email are required.' }, { status: 400 });
    }

    // Generate readable invite code (e.g. GC-928)
    const codeSuffix = Math.floor(100 + Math.random() * 900);
    const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'BDK';
    const invite_code = `${prefix}${codeSuffix}`;
    const churchId = `church-${prefix.toLowerCase()}-${Date.now()}`;

    const newChurch: ChurchProfile = {
      id: churchId,
      name,
      denomination: denomination || 'Non-Denominational',
      city: city || '',
      state_province: state_province || '',
      country: country || 'United States',
      website: website || '',
      contact_email,
      phone: phone || '',
      invite_code,
      member_count: 1,
      is_verified: true,
      created_at: new Date().toISOString(),
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getServerClient();
      const { data, error } = await supabase
        .from('churches')
        .insert({
          id: newChurch.id,
          name: newChurch.name,
          denomination: newChurch.denomination,
          city: newChurch.city,
          state_province: newChurch.state_province,
          country: newChurch.country,
          website: newChurch.website,
          contact_email: newChurch.contact_email,
          phone: newChurch.phone,
          invite_code: newChurch.invite_code,
          member_count: 1,
          is_verified: true,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, church: data });
      }
    }

    return NextResponse.json({ success: true, church: newChurch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
