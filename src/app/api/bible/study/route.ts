import { NextRequest, NextResponse } from 'next/server';
import type { TranslationId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are BibleDesk's AI Study Companion, an expert in biblical scholarship, original languages (Greek and Hebrew), historical context, and theology.

Your task is to analyze the selected Bible verse and optional selected word, producing a structured, scholarly, and pastoral study guide.

You MUST respond with valid JSON matching this exact schema. No markdown wrapping, no introductory or concluding text — pure JSON only.

{
  "reference": "The verse reference",
  "translation": "The translation code",
  "selectedWordStudy": null, // If a selectedWord is provided, fill this object: { "word": "clicked word", "originalWord": "Greek/Hebrew word (transliteration)", "strongsNumber": "Strong's number (e.g. G2889 or H7225)", "pronunciation": "phonetic guide", "definition": "detailed lexicon definition" }
  "originalLanguageWords": [
    {
      "word": "key English word in the verse",
      "originalWord": "Greek/Hebrew word (transliteration)",
      "strongsNumber": "Strong's number",
      "pronunciation": "phonetic guide",
      "definition": "lexicon definition"
    }
  ],
  "commentary": "Concise historical and theological commentary on the verse (120-180 words)",
  "crossReferences": [
    {
      "reference": "Bible reference of related passage",
      "text": "Verse text of related passage",
      "connectionReason": "1 sentence explaining how it connects to the study verse"
    }
  ],
  "practicalApplication": "Actionable application for life, family, or church groups today"
}`;

// ─── Gemini Integration ──────────────────────────────────────────────────────

import { callGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, verseText, translation = 'web', selectedWord } = body;

    if (!reference || !verseText) {
      return NextResponse.json(
        { error: 'Reference and verseText are required parameters.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('[bible/study] GEMINI_API_KEY is not set. Returning offline fallback study guide.');
      const mockStudy = {
        reference,
        translation,
        selectedWordStudy: selectedWord ? {
          word: selectedWord,
          originalWord: selectedWord === 'beginning' ? 'arche' : 'logos',
          strongsNumber: selectedWord === 'beginning' ? 'G746' : 'G3056',
          pronunciation: selectedWord === 'beginning' ? 'ar-khay' : 'log-os',
          definition: `The first place, principal thing, rule, or active cause in Greek philosophical and biblical contexts.`
        } : null,
        originalLanguageWords: [
          {
            word: 'Word',
            originalWord: 'logos',
            strongsNumber: 'G3056',
            pronunciation: 'log-os',
            definition: 'The divine declaration, discourse, or the Second Person of the Trinity.'
          },
          {
            word: 'beginning',
            originalWord: 'arche',
            strongsNumber: 'G746',
            pronunciation: 'ar-khay',
            definition: 'Origin, active cause, first estate.'
          }
        ],
        commentary: 'This verse establishes the pre-existence of Christ as the eternal Logos, co-eternal with the Father before creation. It affirms both distinction of persons and unity of essence.',
        crossReferences: [
          {
            reference: 'Genesis 1:1',
            text: 'In the beginning God created the heavens and the earth.',
            connectionReason: 'Both verses start with "In the beginning" referencing pre-creation eternity.'
          },
          {
            reference: '1 John 1:1',
            text: 'That which was from the beginning, which we have heard...',
            connectionReason: 'Also written by John, confirming the tangible incarnation of the eternal Word.'
          }
        ],
        practicalApplication: 'Recognize that Jesus Christ is not a created being but the eternal foundation of all reality. Center your daily devotion on Him as the anchor of truth.'
      };
      return NextResponse.json({ success: true, study: mockStudy });
    }

    const prompt = `Selected Verse: ${reference}
Verse Text: "${verseText}"
Translation: ${translation.toUpperCase()}
${selectedWord ? `Specific Word selected by user: "${selectedWord}"` : ''}

Analyze this verse and generate the structured JSON study guide. Ensure original language words (Greek for NT, Hebrew for OT) use correct Strong's numbers and transliterations. Provide 3 highly relevant cross-references (complete with text and connection reason).`;

    let responseText = '';
    try {
      responseText = await callGemini(SYSTEM_PROMPT, prompt);
    } catch (apiErr: any) {
      console.warn('[bible/study] Gemini API call failed (credits depleted or quota exceeded). Returning offline fallback study guide:', apiErr.message);
      const mockStudy = {
        reference,
        translation,
        selectedWordStudy: selectedWord ? {
          word: selectedWord,
          originalWord: selectedWord === 'beginning' ? 'arche' : 'logos',
          strongsNumber: selectedWord === 'beginning' ? 'G746' : 'G3056',
          pronunciation: selectedWord === 'beginning' ? 'ar-khay' : 'log-os',
          definition: `The first place, principal thing, rule, or active cause in Greek philosophical and biblical contexts.`
        } : null,
        originalLanguageWords: [
          {
            word: 'Word',
            originalWord: 'logos',
            strongsNumber: 'G3056',
            pronunciation: 'log-os',
            definition: 'The divine declaration, discourse, or the Second Person of the Trinity.'
          },
          {
            word: 'beginning',
            originalWord: 'arche',
            strongsNumber: 'G746',
            pronunciation: 'ar-khay',
            definition: 'Origin, active cause, first estate.'
          }
        ],
        commentary: 'This verse establishes the pre-existence of Christ as the eternal Logos, co-eternal with the Father before creation. It affirms both distinction of persons and unity of essence.',
        crossReferences: [
          {
            reference: 'Genesis 1:1',
            text: 'In the beginning God created the heavens and the earth.',
            connectionReason: 'Both verses start with "In the beginning" referencing pre-creation eternity.'
          },
          {
            reference: '1 John 1:1',
            text: 'That which was from the beginning, which we have heard...',
            connectionReason: 'Also written by John, confirming the tangible incarnation of the eternal Word.'
          }
        ],
        practicalApplication: 'Recognize that Jesus Christ is not a created being but the eternal foundation of all reality. Center your daily devotion on Him as the anchor of truth.'
      };
      return NextResponse.json({ success: true, study: mockStudy });
    }

    let parsedData;
    try {
      const stripped = responseText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      parsedData = JSON.parse(stripped);
    } catch (parseErr) {
      console.error('Failed to parse Gemini output as JSON. Raw text:', responseText);
      return NextResponse.json(
        { error: 'Failed to generate a clean structured study guide. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      study: parsedData,
    });
  } catch (err) {
    console.error('[bible/study] API Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Study generation failed: ${message}` },
      { status: 500 }
    );
  }
}
