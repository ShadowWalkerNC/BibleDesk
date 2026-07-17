import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User session is required.' }, { status: 401 });
  }

  const supabase = getServerClient();
  try {
    const { data, error } = await supabase
      .from('sermon_notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, outlines: data ?? [] });
  } catch (err: any) {
    console.error('[api/sermons] GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  try {
    const body = await req.json();
    const { id, user_id, title, content, publishToDiscord = false } = body;

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'User session is required.' }, { status: 401 });
    }

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required.' }, { status: 400 });
    }

    let result;

    if (id) {
      // Update existing outline
      const { data, error } = await supabase
        .from('sermon_notes')
        .update({ title, content })
        .eq('id', id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new outline
      const { data, error } = await supabase
        .from('sermon_notes')
        .insert({ user_id, title, content })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Handle Discord publishing via Webhook
    if (publishToDiscord) {
      const webhookUrl = process.env.SIGIL_SERMON_WEBHOOK_URL || process.env.PRAYER_DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          // Format text (limit content size for Discord embed fields)
          const cleanText = content.replace(/[\#\*\_]/g, ''); // strip outline markdown highlights
          const textPreview = cleanText.length > 1000 ? cleanText.slice(0, 1000) + '...' : cleanText;

          const payload = {
            embeds: [
              {
                title: `📝 New Sermon Study Outline: ${title}`,
                description: textPreview,
                color: 0xe8b320, // Warm Gold accent color
                fields: [
                  {
                    name: 'Status',
                    value: 'Published Outline',
                    inline: true,
                  },
                  {
                    name: 'Editor Link',
                    value: `${req.nextUrl.origin}/sermons`,
                    inline: true,
                  },
                ],
                footer: {
                  text: 'BibleDesk Church Workspace',
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
          console.warn('[api/sermons] Discord Webhook call failed (non-fatal):', webhookErr);
        }
      }
    }

    return NextResponse.json({ success: true, outline: result });
  } catch (err: any) {
    console.error('[api/sermons] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!id || !userId) {
    return NextResponse.json({ success: false, error: 'ID and userId are required.' }, { status: 400 });
  }

  const supabase = getServerClient();
  try {
    const { error } = await supabase
      .from('sermon_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/sermons] DELETE Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
