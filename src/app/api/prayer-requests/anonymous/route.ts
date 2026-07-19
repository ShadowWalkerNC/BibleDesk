import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;
const DAILY_LIMIT_MAX_REQUESTS = 50;

// Simple in-memory rate-limiter for anonymous submissions
const ipRequests = new Map<string, { count: number; firstRequestTime: number; dailyCount: number; dailyStartTime: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function enforceRateLimit(ip: string): { allowed: boolean; resetTime?: Date } {
  const now = Date.now();
  let limitData = ipRequests.get(ip);

  if (!limitData) {
    limitData = { count: 1, firstRequestTime: now, dailyCount: 1, dailyStartTime: now };
    ipRequests.set(ip, limitData);
    return { allowed: true };
  }

  // Daily check
  if (now - limitData.dailyStartTime > 24 * 60 * 60 * 1000) {
    limitData.dailyCount = 0;
    limitData.dailyStartTime = now;
  }

  if (limitData.dailyCount >= DAILY_LIMIT_MAX_REQUESTS) {
    const dailyResetTime = new Date(limitData.dailyStartTime + 24 * 60 * 60 * 1000);
    return { allowed: false, resetTime: dailyResetTime };
  }

  // Window check
  if (now - limitData.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    limitData.count = 1;
    limitData.firstRequestTime = now;
  } else {
    limitData.count++;
  }

  limitData.dailyCount++;
  ipRequests.set(ip, limitData);

  if (limitData.count > RATE_LIMIT_MAX_REQUESTS) {
    const windowResetTime = new Date(limitData.firstRequestTime + RATE_LIMIT_WINDOW_MS);
    return { allowed: false, resetTime: windowResetTime };
  }

  return { allowed: true };
}

export async function POST(req: NextRequest) {
  // 1. POST method verification
  if (req.method !== 'POST') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  // 2. Content-Type check
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
  }

  // 3. Rate limiter check
  const ip = getClientIp(req);
  const rateLimitStatus = enforceRateLimit(ip);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      { error: `Too many submissions. Please wait until ${rateLimitStatus.resetTime?.toLocaleTimeString()}` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // 11. Reject request if body contains unknown top-level keys
    const allowedKeys = ['text', 'locationTier', 'locationLabel', 'urgency', 'category', 'isRestrictedRegion', 'honeypot', 'renderedAt'];
    const bodyKeys = Object.keys(body);
    const hasUnknownKeys = bodyKeys.some(key => !allowedKeys.includes(key));
    if (hasUnknownKeys) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    const {
      text,
      locationTier,
      locationLabel,
      urgency = 'normal',
      category = 'general',
      isRestrictedRegion = false,
      honeypot = '',
      renderedAt
    } = body;

    // 4. Honeypot check
    if (honeypot !== '') {
      console.log(`[anonymous-submission] Honeypot triggered by ${ip}. Silently dropping.`);
      return NextResponse.json({ success: true, message: 'Submission received successfully.' }, { status: 200 });
    }

    // 5. RenderedAt timestamp window validation
    const now = Date.now();
    if (!renderedAt || typeof renderedAt !== 'number' || renderedAt > now - 2000 || renderedAt < now - 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    // 6. Text validation (10-2000 chars, max 3 URLs)
    if (!text || typeof text !== 'string' || text.length < 10 || text.length > 2000) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urlCount = (text.match(urlPattern) || []).length;
    if (urlCount > 3) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    // 7. locationTier validation
    const allowedTiers = ['exact', 'city', 'region', 'country_only', 'hidden'];
    if (!locationTier || !allowedTiers.includes(locationTier)) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    // 8. locationLabel validation
    if (!locationLabel || typeof locationLabel !== 'string' || locationLabel.length < 2 || locationLabel.length > 100) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    // 9. urgency validation
    const allowedUrgencies = ['low', 'normal', 'high'];
    if (urgency && !allowedUrgencies.includes(urgency)) {
      return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
    }

    // 12. RAN (Restricted Access Nation) override
    let finalLocationTier = locationTier;
    const finalLocationLabel = locationLabel;
    let finalStatus = 'pending';
    let finalText = text;

    if (isRestrictedRegion) {
      // Force hide exact location
      finalLocationTier = 'country_only';
      
      // Strip identifying details (names/photos replaced with initials or general role labels)
      // Remove capitalized names following common indicators like "by Name", "for Name"
      finalText = text.replace(/(?:by|for|from|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, (match, p1) => {
        const initials = p1.split(/\s+/).map((n: string) => n[0]).join('');
        return match.replace(p1, `${initials}.`);
      });

      finalStatus = 'pending';
    }

    // 14. Submitter hash (hash of IP + user-agent)
    const userAgent = req.headers.get('user-agent') || '';
    const salt = process.env.IP_HASH_SALT || 'bibledesk-default-salt';
    const submitterHash = crypto.createHash('sha256').update(ip + userAgent + salt).digest('hex');

    // 13. Insert into Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getServerClient();
      const { error: dbError } = await supabase
        .from('prayer_requests')
        .insert({
          text_plain: finalText.trim(),
          location_tier: finalLocationTier,
          location_label: finalLocationLabel.trim(),
          is_restricted_region: isRestrictedRegion,
          urgency,
          category,
          status: finalStatus,
          submitter_hash: submitterHash
        });

      if (dbError) {
        console.error('[anonymous-submission] Database insert error:', dbError);
        return NextResponse.json({ error: 'Something went wrong generating your answer. Please try again.' }, { status: 500 });
      }
    } else {
      console.log('[anonymous-submission] Offline mode: bypass DB write.', {
        text_plain: finalText,
        location_tier: finalLocationTier,
        location_label: finalLocationLabel,
        is_restricted_region: isRestrictedRegion,
        urgency,
        category,
        status: finalStatus,
        submitter_hash: submitterHash
      });
    }

    // 15. Return generic success message only
    return NextResponse.json({ success: true, message: 'Submission received successfully.' });
  } catch (err: any) {
    console.error('[anonymous-submission] Post Handler Error:', err);
    // 16. Return generic error message on validation failure / parsing issues
    return NextResponse.json({ error: 'Request parameters are invalid.' }, { status: 400 });
  }
}
