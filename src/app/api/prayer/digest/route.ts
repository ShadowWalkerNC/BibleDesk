// BibleDesk — Prayer Digest API Route
// Generates a preview of daily/weekly prayer intercession digests.
// NOTE: no mail provider is wired, so this route never sends email — it only
// renders a preview. Wiring a real provider is an explicit product decision
// tracked separately.
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import {
  prayerCommitments,
  prayerContacts,
  prayerNotificationPreferences,
  type PrayerCommitment,
  type PrayerContact,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface DigestCommitment {
  id: string;
  title: string;
  private_details: string | null;
  schedule_kind: string;
  next_due_at: string;
  contact?: {
    display_name: string;
    email: string | null;
    phone: string | null;
    category: string | null;
  } | null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required to access prayer digest.'
      }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        offline: true,
        message: 'Database unconfigured; digest available in offline UI.',
        digest: null,
      });
    }

    const db = await getDb();

    // Fetch user's active commitments and contacts
    const [commitments, contacts] = await Promise.all([
      db
        .select()
        .from(prayerCommitments)
        .where(
          and(
            eq(prayerCommitments.userId, user.id),
            eq(prayerCommitments.status, 'active')
          )
        ),
      db
        .select()
        .from(prayerContacts)
        .where(
          and(
            eq(prayerContacts.userId, user.id),
            eq(prayerContacts.isArchived, false)
          )
        ),
    ]);

    const now = new Date();
    const contactsMap = new Map<string, PrayerContact>(contacts.map((c) => [c.id, c]));

    const dueCommitments: DigestCommitment[] = (commitments as PrayerCommitment[])
      .filter((c) => c.nextDueAt != null && c.nextDueAt <= now)
      .map((c) => {
        const contact = c.contactId ? contactsMap.get(c.contactId) ?? null : null;
        return {
          id: c.id,
          title: c.title,
          private_details: c.privateDetails,
          schedule_kind: c.scheduleKind,
          next_due_at: (c.nextDueAt as Date).toISOString(),
          contact: contact
            ? {
                display_name: contact.displayName,
                email: contact.email,
                phone: contact.phone,
                category: contact.category,
              }
            : null,
        };
      });

    // Generate formatted HTML & plain text digest
    const userName = user.name || user.email?.split('@')[0] || 'Friend';
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const subject = `Your Prayer Focus for ${dateStr} (${dueCommitments.length} to hold in prayer)`;

    let itemsHtml = '';
    let itemsText = '';

    if (dueCommitments.length === 0) {
      itemsHtml = '<p style="color: #64748b; font-style: italic;">You are all caught up on scheduled prayer commitments for today. Rest in God\'s grace.</p>';
      itemsText = 'You are all caught up on scheduled prayer commitments for today. Rest in God\'s grace.\n';
    } else {
      itemsHtml = dueCommitments.map((item, idx) => {
        const contactName = escapeHtml(item.contact?.display_name) || 'Personal Intention';
        const category = item.contact?.category ? `(${escapeHtml(item.contact.category)})` : '';
        const details = item.private_details ? `<div style="font-size: 13px; color: #475569; margin-top: 4px;">${escapeHtml(item.private_details)}</div>` : '';

        return `
          <div style="padding: 12px 16px; margin-bottom: 10px; background: #f8fafc; border-left: 4px solid #d4a017; border-radius: 4px;">
            <strong style="color: #0f172a; font-size: 15px;">${idx + 1}. ${contactName} ${category}</strong>
            <div style="font-size: 14px; color: #1e293b; margin-top: 4px;">${escapeHtml(item.title)}</div>
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
          <p>Grace and peace to you, ${escapeHtml(userName)}.</p>
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
      preview: true,
      emailSent: false,
      reason: 'no mail provider configured',
      dueCount: dueCommitments.length,
      digest: {
        subject,
        date: dateStr,
        commitments: dueCommitments,
        html: htmlBody,
        text: itemsText,
      },
      message: 'Digest preview generated. Preview only — no mail provider is configured.',
    });
  } catch (err: unknown) {
    console.error('[api/prayer/digest] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST handles cron triggers (e.g. daily cron job)
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    // Check if called with authorized cron secret or user token
    const isCron = Boolean(expectedSecret) && cronSecret === expectedSecret;
    const user = !isCron ? await getAuthenticatedUser(req) : null;

    if (!isCron && !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        preview: true,
        emailSent: false,
        message: 'Database unconfigured; digest preview only, nothing mailed out.',
      });
    }

    const db = await getDb();

    // If cron, find all users who have enabled email digests
    if (isCron) {
      const prefs = await db
        .select({
          userId: prayerNotificationPreferences.userId,
          emailEnabled: prayerNotificationPreferences.emailEnabled,
          timezone: prayerNotificationPreferences.timezone,
        })
        .from(prayerNotificationPreferences)
        .where(eq(prayerNotificationPreferences.emailEnabled, true));

      const processedCount = prefs.length;
      return NextResponse.json({
        success: true,
        preview: true,
        emailSent: false,
        message: `Cron ran. ${processedCount} users have digests enabled; nothing mailed out — no mail provider is configured.`,
        processedCount,
      });
    }

    // User-triggered POST returns today's digest summary
    return GET(req);
  } catch (err: unknown) {
    console.error('[api/prayer/digest] POST Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
