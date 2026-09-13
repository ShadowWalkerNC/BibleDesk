import { NextRequest, NextResponse } from 'next/server';
import { getStrongsDefinition, getCrossReferences } from '@/lib/lexicon';
import { getLocalPassage } from '@/lib/bible-local';
import { TRANSLATIONS, type TranslationId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const strongs = searchParams.get('strongs');
  const reference = searchParams.get('reference');
  const translationParam = searchParams.get('translation') || 'web';

  if (!TRANSLATIONS.some((t) => t.id === translationParam)) {
    return NextResponse.json(
      { error: `Invalid translation: "${translationParam}". Supported translations: ${TRANSLATIONS.map((t) => t.id).join(', ')}.` },
      { status: 400 }
    );
  }
  const translation = translationParam as TranslationId;

  // 1. Strong's Definition Lookup
  if (strongs) {
    const def = getStrongsDefinition(strongs);
    if (!def) {
      return NextResponse.json({ error: `Strong's entry not found for tag: "${strongs}"` }, { status: 404 });
    }
    return NextResponse.json({ success: true, definition: def });
  }

  // 2. Cross References for a Verse
  if (reference) {
    const refs = getCrossReferences(reference);
    const enriched = refs.map((ref) => {
      const passage = getLocalPassage(ref, translation);
      return {
        reference: ref,
        text: passage?.text || '',
        connectionReason: 'Cross-reference from Treasury of Scripture Knowledge (TSK)',
      };
    });

    return NextResponse.json({
      success: true,
      reference,
      crossReferences: enriched,
    });
  }

  return NextResponse.json({ error: 'Provide either "strongs" or "reference" parameter.' }, { status: 400 });
}
