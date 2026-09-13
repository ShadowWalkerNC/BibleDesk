import { NextRequest, NextResponse } from 'next/server';
import { DAILY_DEVOTIONALS, DailyDevotionalItem } from '@/lib/dailyData';
import { defineRoute, routeError, type RouteSchema } from '@/lib/platform';

export interface DailyVerse extends DailyDevotionalItem {
  date: string;
}

interface DailyInput {
  random: boolean;
  index: number | null;
}

// Parses the route's current query params (random === 'true'; index as
// integer, ignored when unparseable). The handler below keeps the original
// selection logic, so behavior is unchanged.
const dailySchema: RouteSchema<DailyInput> = {
  safeParse(input: unknown) {
    const params = (input ?? {}) as Record<string, unknown>;
    const random = params.random === 'true';
    let index: number | null = null;
    if (params.index !== undefined && params.index !== null) {
      const parsed = parseInt(String(params.index), 10);
      if (!isNaN(parsed)) index = parsed;
    }
    return { success: true, data: { random, index } };
  },
};

export const GET = defineRoute({
  schema: dailySchema,
  handler: async (_req: NextRequest, { random, index }, { requestId }) => {
    try {
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

      let verseIndex = dayOfYear % DAILY_DEVOTIONALS.length;

      if (random) {
        verseIndex = Math.floor(Math.random() * DAILY_DEVOTIONALS.length);
      } else if (index !== null) {
        verseIndex = Math.abs(index) % DAILY_DEVOTIONALS.length;
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
      return routeError(requestId, 500, 'Failed to fetch daily verse', 'DAILY_FAILED');
    }
  },
});
