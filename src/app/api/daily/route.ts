import { NextRequest, NextResponse } from 'next/server';
import { DAILY_DEVOTIONALS, DailyDevotionalItem } from '@/lib/dailyData';

export interface DailyVerse extends DailyDevotionalItem {
  date: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isRandom = searchParams.get('random') === 'true';
    const indexParam = searchParams.get('index');

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    let verseIndex = dayOfYear % DAILY_DEVOTIONALS.length;

    if (isRandom) {
      verseIndex = Math.floor(Math.random() * DAILY_DEVOTIONALS.length);
    } else if (indexParam !== null) {
      const parsed = parseInt(indexParam, 10);
      if (!isNaN(parsed)) {
        verseIndex = Math.abs(parsed) % DAILY_DEVOTIONALS.length;
      }
    }

    const selected = DAILY_DEVOTIONALS[verseIndex];

    const result: DailyVerse = {
      date: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      ...selected,
    };

    return NextResponse.json({
      success: true,
      dailyVerse: result,
      totalCount: DAILY_DEVOTIONALS.length,
      currentIndex: verseIndex,
    });
  } catch (err: unknown) {
    console.error('GET /api/daily error:', err);
    return NextResponse.json({ error: 'Failed to fetch daily verse' }, { status: 500 });
  }
}
