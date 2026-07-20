import { NextRequest, NextResponse } from 'next/server';
import { fetchPassage } from '@/lib/bible';
import type { TranslationId, BibleAnswer } from '@/types';

// Popular concordance topic keyword mappings for non-AI fallback
const TOPIC_CONCORDANCE: Record<string, { summary: string; verses: string[] }> = {
  grace: {
    summary: 'Grace is God’s unmerited favor, enabling salvation, righteousness, and daily strength through Jesus Christ.',
    verses: ['Ephesians 2:8-9', 'Romans 3:24', '2 Corinthians 12:9', 'Titus 2:11'],
  },
  love: {
    summary: 'God is the ultimate source of love. Christian love (agape) is sacrificial, patient, and action-oriented.',
    verses: ['John 3:16', '1 Corinthians 13:4-8', '1 John 4:19', 'Romans 5:8'],
  },
  faith: {
    summary: 'Faith is trust and confidence in God’s promises and character, trusting what is unseen.',
    verses: ['Hebrews 11:1', 'Romans 10:17', 'Ephesians 2:8', 'Proverbs 3:5-6'],
  },
  salvation: {
    summary: 'Salvation is deliverance from sin and eternal death, provided freely through Christ’s sacrifice.',
    verses: ['Romans 10:9-10', 'John 14:6', 'Acts 4:12', 'Ephesians 2:8-9'],
  },
  peace: {
    summary: 'True peace (shalom) comes from reconciliation with God through Christ and trusting His sovereignty.',
    verses: ['Philippians 4:6-7', 'John 14:27', 'Isaiah 26:3', 'Romans 5:1'],
  },
  prayer: {
    summary: 'Prayer is direct communication with God, offering our requests, confessions, and thanksgiving.',
    verses: ['Philippians 4:6', '1 Thessalonians 5:17', 'Matthew 6:9-13', 'James 5:16'],
  },
  hope: {
    summary: 'Biblical hope is not wishful thinking, but confident expectation based on God’s eternal promises.',
    verses: ['Romans 15:13', 'Hebrews 6:19', 'Jeremiah 29:11', 'Psalm 42:11'],
  },
};

export async function POST(req: NextRequest) {
  try {
    const { query, translation = 'web' } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const lowerQuery = cleanQuery.toLowerCase();
    const transId = (translation || 'web') as TranslationId;

    // Check if query is a topic keyword
    const matchedTopicKey = Object.keys(TOPIC_CONCORDANCE).find(k => lowerQuery.includes(k));
    const topicData = matchedTopicKey ? TOPIC_CONCORDANCE[matchedTopicKey] : null;

    // Target references to fetch
    let targetReferences: string[] = [];
    if (topicData) {
      targetReferences = topicData.verses;
    } else {
      // Treat as direct Bible reference (e.g. "John 3:16" or "Ephesians 6")
      targetReferences = [cleanQuery];
    }

    // Fetch Scripture passages
    const passagePromises = targetReferences.map(ref => fetchPassage(ref, transId));
    const passageResults = await Promise.all(passagePromises);
    const validPassages = passageResults.filter((p): p is NonNullable<typeof p> => p !== null);

    // If query was not a topic and reference fetch failed, try fallback passages
    let passagesToUse = validPassages;
    if (passagesToUse.length === 0) {
      const fallbackPassages = await Promise.all([
        fetchPassage('John 3:16-17', transId),
        fetchPassage('Romans 8:28', transId),
      ]);
      passagesToUse = fallbackPassages.filter((p): p is NonNullable<typeof p> => p !== null);
    }

    const primaryPassage = passagesToUse[0];
    const primaryText = primaryPassage?.text || '';
    const summaryText = topicData
      ? topicData.summary
      : primaryPassage
      ? `Direct Scripture Search: "${primaryPassage.reference}" — ${primaryText.replace(/\s+/g, ' ').slice(0, 250)}...`
      : `Scripture search results for "${cleanQuery}".`;

    const citations = passagesToUse.map(p => p.reference);

    // Format structured BibleAnswer for direct non-AI response
    const answerData: BibleAnswer = {
      id: `direct-${Date.now()}`,
      question: cleanQuery,
      summary: summaryText,
      confidence: 'high',
      status: 'approved',
      created_at: new Date().toISOString(),
      translation_used: transId,
      disclaimer: 'This answer was generated via direct Scripture Concordance search (Non-AI Mode).',
      dimensions: {
        scripture: {
          title: 'Scripture Passages',
          content: passagesToUse.map(p => `**${p.reference}**\n"${(p.text || '').trim()}"`).join('\n\n'),
          key_points: passagesToUse.map(p => `${p.reference}: ${(p.text || '').trim().slice(0, 100)}...`),
          citations: citations,
        },
        historical: {
          title: 'Historical & Canonical Setting',
          content: `Passages retrieved from the canonical Old and New Testament manuscripts in the ${transId.toUpperCase()} translation.`,
          key_points: [
            `Translation: ${transId.toUpperCase()}`,
            `Direct Canonical Reference`,
          ],
          citations: citations,
        },
        original_language: {
          title: 'Original Languages & Text',
          content: `Text corresponds to original Hebrew (Masoretic) and Greek (Textus Receptus / Critical Edition) source texts rendered in English (${transId.toUpperCase()}).`,
          key_points: [
            'Direct Word-for-Word Concordance Translation',
          ],
          citations: citations,
        },
        theological: {
          title: 'Theological Focus',
          content: summaryText,
          key_points: [
            'Grounded in Sola Scriptura',
          ],
          citations: citations,
        },
        practical: {
          title: 'Practical Reflection',
          content: `Read and meditate on ${citations.join(', ')}. Compare with other passages in your Bible reader to deepen your personal study.`,
          key_points: [
            `Reflect on ${citations[0] || 'God\'s Word'} daily`,
          ],
          citations: citations,
        },
      },
    };

    return NextResponse.json({
      success: true,
      mode: 'non-ai',
      answer: answerData,
    });
  } catch (err: unknown) {
    console.error('[search/direct] Error:', err);
    const msg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
