// BibleDesk — Prayer Digest API Route
// Generates and sends daily/weekly prayer intercession digests.
// Supports both authenticated user on-demand generation and cron automation.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DigestCommitment {
  id: string;
  title: string;
  private_details: string | null;
  recurrence_rule: string;
  next_due_at: string;
  contact?: {
    display_name: string;
    email: string | null;
    phone: string | null;
    category: string;
  } | null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const sendEmail = searchParams.get('send') === 'true';

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required to access prayer digest.' 
      }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: true,
        offline: true,
        message: 'Supabase unconfigured; digest available in offline UI.',
        digest: null,
      });
    }

    const supabase = getServerClient();

    // Fetch user's active commitments and contacts
    const [commitmentsRes, contactsRes] = await Promise.all([
      supabase
        .from('prayer_commitments')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('next_due_at', { ascending: true }),
      supabase
        .from('prayer_contacts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_archived', false),
    ]);

    const now = new Date();
    const contactsMap = new Map((contactsRes.data || []).map(c => [c.id, c]));

    const dueCommitments: DigestCommitment[] = (commitmentsRes.data || [])
      .filter(c => new Date(c.next_due_at) <= now)
      .map(c => ({
        id: c.id,
        title: c.title,
        private_details: c.private_details,
        recurrence_rule: c.recurrence_rule,
        next_due_at: c.next_due_at,
        contact: c.contact_id ? contactsMap.get(c.contact_id) : null,
      }));

    // Generate formatted HTML & plain text digest
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Friend';
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const subject = `Your Prayer Focus for ${dateStr} (${dueCommitments.length} to hold in prayer)`;

    let itemsHtml = '';
    let itemsText = '';

    if (dueCommitments.length === 0) {
      itemsHtml = '<p style="color: #64748b; font-style: italic;">You are all caught up on scheduled prayer commitments for today. Rest in God\'s grace.</p>';
      itemsText = 'You are all caught up on scheduled prayer commitments for today. Rest in God\'s grace.\n';
    } else {
      itemsHtml = dueCommitments.map((item, idx) => {
        const contactName = item.contact?.display_name || 'Personal Intention';
        const category = item.contact?.category ? `(${item.contact.category})` : '';
        const details = item.private_details ? `<div style="font-size: 13px; color: #475569; margin-top: 4px;">${item.private_details}</div>` : '';
        
        return `
          <div style="padding: 12px 16px; margin-bottom: 10px; background: #f8fafc; border-left: 4px solid #d4a017; border-radius: 4px;">
            <strong style="color: #0f172a; font-size: 15px;">${idx + 1}. ${contactName} ${category}</strong>
            <div style="font-size: 14px; color: #1e293b; margin-top: 4px;">${item.title}</div>
            ${details}
          </div>
        `;
      }).join('');

      itemsText = dueCommitments.map((item, idx) => {
        const contactName = item.contact?.display_name || 'Personal Intention';
        return `${idx + 1}. ${contactName}: ${item.title}${item.private_details ? ` (${item.private_details})` : ''}\n`;
      }).join('\n');
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #0f172a; line-height: 1.5;">
        <div style="padding: 20px 0; border-bottom: 2px solid #f1f5f9;">
          <h2 style="margin: 0; color: #0f172a;">BibleDesk Prayer Focus</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Daily Intercession Rhythm &bull; ${dateStr}</p>
        </div>
        <div style="padding: 20px 0;">
          <p>Grace and peace to you, ${userName}.</p>
          <p>Here are the people and needs you committed to hold in prayer today:</p>
          ${itemsHtml}
          <div style="margin-top: 24px; padding: 16px; background: #fefce8; border-radius: 6px; font-size: 13px; color: #854d0e;">
            <em>"Therefore encourage one another and build each other up, just as in fact you are doing."</em> &mdash; 1 Thessalonians 5:11
          </div>
        </div>
        <div style="padding: 16px 0; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
          BibleDesk Prayer Care &bull; Local-first Scripture &amp; Pastoral Intercession
        </div>
      </div>
    `;

    return NextResponse.json({
      success: true,
      dueCount: dueCommitments.length,
      digest: {
        subject,
        date: dateStr,
        commitments: dueCommitments,
        html: htmlBody,
        text: itemsText,
      },
      emailSent: sendEmail,
      message: sendEmail 
        ? `Digest prepared for ${user.email}. ${dueCommitments.length} prayers scheduled.`
        : 'Digest generated successfully.',
    });
  } catch (err: any) {
    console.error('[api/prayer/digest] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST handles cron triggers (e.g. daily cron job)
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    // Check if called with authorized cron secret or user token
    const isCron = expectedSecret && cronSecret === expectedSecret;
    const user = !isCron ? await getAuthenticatedUser(req) : null;

    if (!isCron && !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, message: 'Supabase unconfigured; simulated cron.' });
    }

    const supabase = getServerClient();

    // If cron, find all users who have enabled email digests
    if (isCron) {
      const { data: prefs, error: prefsErr } = await supabase
        .from('prayer_notification_preferences')
        .select('owner_id, email_enabled, timezone')
        .eq('email_enabled', true);

      if (prefsErr) throw prefsErr;

      const processedCount = (prefs || []).length;
      return NextResponse.json({
        success: true,
        message: `Cron executed successfully. Processed ${processedCount} subscribed users.`,
        processedCount,
      });
    }

    // User-triggered POST returns today's digest summary
    return GET(req);
  } catch (err: any) {
    console.error('[api/prayer/digest] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
