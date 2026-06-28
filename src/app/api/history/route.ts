/**
 * GET /api/history
 *
 * Returns paginated answer history from Supabase.
 *
 * Query params:
 *   page        — 1-based page number (default 1)
 *   limit       — page size 1–50 (default 20)
 *   search      — case-insensitive substring search on `question`
 *   confidence  — filter by confidence level: high | medium | low
 *
 * Response:
 *   { answers: HistoryAnswer[], total: number, page: number, limit: number }
 *
 * Returns { answers: [], total: 0 } gracefully if Supabase is not configured.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page       = Math.max(1,  parseInt(searchParams.get('page')  ?? '1',  10));
  const limit      = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search     = searchParams.get('search')?.trim() ?? '';
  const confidence = searchParams.get('confidence')?.trim() ?? '';

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supaUrl || !supaKey) {
    return NextResponse.json({ answers: [], total: 0, page, limit });
  }

  const offset = (page - 1) * limit;

  // Build Supabase REST query params
  const params = new URLSearchParams({
    select:  'id,question,summary,confidence,translation_used,status,created_at',
    order:   'created_at.desc',
    offset:  String(offset),
    limit:   String(limit),
  });

  if (search)     params.set('question', `ilike.*${search}*`);
  if (confidence) params.set('confidence', `eq.${confidence}`);

  try {
    // Fetch page
    const res = await fetch(
      `${supaUrl}/rest/v1/answers?${params}`,
      {
        headers: {
          apikey:        supaKey,
          Authorization: `Bearer ${supaKey}`,
          'Content-Range': '0-*',
          Prefer:        'count=exact',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ answers: [], total: 0, page, limit });
    }

    const answers = await res.json();

    // Supabase returns total count in Content-Range header: "0-19/543"
    const range = res.headers.get('content-range') ?? '';
    const total = parseInt(range.split('/')[1] ?? '0', 10) || answers.length;

    return NextResponse.json({ answers, total, page, limit });
  } catch {
    return NextResponse.json({ answers: [], total: 0, page, limit });
  }
}
