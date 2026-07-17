import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServerClient();
  try {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ success: true, prayers: data ?? [] });
  } catch (err: any) {
    console.error('[api/prayer] GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  try {
    const body = await req.json();
    const { request, display_name = 'Anonymous', anonymous = false, user_id = null } = body;

    if (!request || request.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Prayer request must be at least 5 characters.' },
        { status: 400 }
      );
    }

    const nameToStore = anonymous ? 'Anonymous' : display_name.trim();

    // Insert prayer request into Supabase
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({
        user_id: user_id || null,
        display_name: nameToStore,
        request: request.trim(),
        likes_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Send Webhook to Discord (Sigil Bot trigger)
    const webhookUrl = process.env.PRAYER_DISCORD_WEBHOOK_URL || process.env.SIGIL_PRAYER_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const payload = {
          embeds: [
            {
              title: '🙏 New Prayer Request',
              description: request.trim(),
              color: 0x4f9cf9, // Blue matching Scripture dimension
              fields: [
                {
                  name: 'Submitted By',
                  value: nameToStore,
                  inline: true,
                },
                {
                  name: 'Date',
                  value: new Date().toLocaleDateString(),
                  inline: true,
                },
              ],
              footer: {
                text: 'BibleDesk Community',
              },
            },
          ],
        };

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (webhookErr) {
        console.warn('[api/prayer] Discord Webhook call failed (non-fatal):', webhookErr);
      }
    }

    return NextResponse.json({ success: true, prayer: data });
  } catch (err: any) {
    console.error('[api/prayer] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Support updating prayers likes / "I prayed for this" count
export async function PUT(req: NextRequest) {
  const supabase = getServerClient();
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    // Call RPC to increment count to prevent race conditions or fetch-modify races
    // But since it's simple, we can do a increment selection:
    const { data: current } = await supabase
      .from('prayer_requests')
      .select('likes_count')
      .eq('id', id)
      .single();

    const count = current ? current.likes_count + 1 : 1;

    const { data, error } = await supabase
      .from('prayer_requests')
      .update({ likes_count: count })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, prayer: data });
  } catch (err: any) {
    console.error('[api/prayer] PUT Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
