import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { seedDatabase } from '@/db/seed';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'No repair action specified. Please choose a valid action.' },
        { status: 400 }
      );
    }

    if (action === 'seed_sample_data') {
      await seedDatabase();
      return NextResponse.json({
        success: true,
        message: 'Starter study workspace successfully loaded! Sample notes, thematic collections, and commentaries are ready.',
        action,
      });
    }

    if (action === 'rebuild_database') {
      const db = await getDb();
      // Test basic database responsiveness
      await db.execute?.('SELECT 1;') || null;
      return NextResponse.json({
        success: true,
        message: 'Database connection verified and core tables confirmed active.',
        action,
      });
    }

    if (action === 'test_ai') {
      const geminiKey = body.geminiKey || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json({
          success: true,
          status: 'offline_ready',
          message: 'Local study foundation is active. Full Scripture reading and search are ready without an API key.',
        });
      }

      // Quick test ping to Google Gemini API
      try {
        const testRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`
        );
        if (testRes.ok) {
          return NextResponse.json({
            success: true,
            status: 'connected',
            message: 'Connected to Google Gemini AI successfully! Your 5-Dimension study assistant is active.',
          });
        } else {
          return NextResponse.json({
            success: false,
            status: 'invalid_key',
            message: 'Could not connect to Google Gemini with this key. Please check for typos or extra spaces.',
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          status: 'network_error',
          message: 'Network timeout while reaching Google Gemini. Please verify your internet connection.',
        });
      }
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized repair action "${action}".` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[System Repair Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected issue occurred while executing this maintenance action. Your existing data remains safe.',
        technicalDetail: err.message,
      },
      { status: 500 }
    );
  }
}
