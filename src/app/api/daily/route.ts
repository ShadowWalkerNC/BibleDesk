import { NextRequest, NextResponse } from 'next/server';

export interface DailyVerse {
  date: string;
  reference: string;
  text: string;
  translation: string;
  theme: string;
  reflection: string;
  prayer: string;
}

const CURATED_DAILY_VERSES: Array<Omit<DailyVerse, 'date'>> = [
  {
    reference: 'Philippians 4:6-7',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
    translation: 'WEB',
    theme: 'Peace & Prayer',
    reflection: 'Worry changes nothing, but prayer changes everything. God invites us to bring every concern to Him in gratitude, promising a peace that protects our minds.',
    prayer: 'Lord, teach me to surrender my anxiety today and rest in Your transcendent peace.',
  },
  {
    reference: 'Isaiah 40:31',
    text: 'But those who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',
    translation: 'WEB',
    theme: 'Endurance & Hope',
    reflection: 'Waiting on God is not passive inaction; it is active trust. When our strength is exhausted, His divine power carries us forward.',
    prayer: 'Father, grant me patience as I wait on You, and renew my strength for the tasks ahead.',
  },
  {
    reference: 'Romans 8:28',
    text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
    translation: 'WEB',
    theme: 'Sovereignty & Purpose',
    reflection: 'Even in dark times, God weaves every hardship into a larger tapestry of redemption and purpose for those who belong to Him.',
    prayer: 'Sovereign God, help me trust Your hand even when I cannot trace Your path.',
  },
  {
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the Lord with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
    translation: 'WEB',
    theme: 'Wisdom & Guidance',
    reflection: 'Human wisdom is finite, but God’s wisdom is infinite. True direction comes when we surrender our plans to His guidance.',
    prayer: 'Lord Jesus, I entrust my decisions and future into Your hands today.',
  },
  {
    reference: 'Lamentations 3:22-23',
    text: 'It is because of the Lord’s loving kindnesses that we are not consumed, because his compassion doesn’t fail. They are new every morning. Great is your faithfulness.',
    translation: 'WEB',
    theme: 'Mercy & Faithfulness',
    reflection: 'Every sunrise brings a fresh supply of God’s unmerited mercy. Yesterday’s failures do not disqualify us from today’s grace.',
    prayer: 'Thank You, Heavenly Father, for Your steadfast love and fresh mercies this morning.',
  },
  {
    reference: 'Joshua 1:9',
    text: 'Haven’t I commanded you? Be strong and courageous. Don’t be afraid, neither be dismayed: for the Lord your God is with you wherever you go.',
    translation: 'WEB',
    theme: 'Courage & Presence',
    reflection: 'Courage is not the absence of fear, but the assurance that God’s presence accompanies us into every battle.',
    prayer: 'Lord, give me holy boldness to obey Your calling today without fear.',
  },
  {
    reference: 'Psalm 23:1-3',
    text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.',
    translation: 'WEB',
    theme: 'Rest & Restoration',
    reflection: 'In a restless world, Jesus is the Good Shepherd who provides contentment, guidance, and deep rest for weary souls.',
    prayer: 'Good Shepherd, lead my heart to Your quiet waters of peace and restoration today.',
  },
  {
    reference: 'Hebrews 11:1',
    text: 'Now faith is assurance of things hoped for, a conviction of things not seen.',
    translation: 'WEB',
    theme: 'Faith & Certainty',
    reflection: 'Faith looks beyond physical circumstances to the immutable character and eternal promises of Almighty God.',
    prayer: 'Lord, deepen my faith so I may stand firm in Your promises regardless of what I see.',
  },
  {
    reference: 'Ephesians 2:8-9',
    text: 'For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.',
    translation: 'WEB',
    theme: 'Grace & Salvation',
    reflection: 'Salvation is an unearned gift of pure divine love. We cannot earn it, nor can we lose what Christ fully purchased.',
    prayer: 'Father, thank You for the gift of grace through Christ. Help me live a life of joyful gratitude.',
  },
  {
    reference: 'Psalm 119:105',
    text: 'Your word is a lamp to my feet, and a light for my path.',
    translation: 'WEB',
    theme: 'Scripture & Guidance',
    reflection: 'God’s Word illuminates one step at a time, providing truth and moral clarity in an uncertain world.',
    prayer: 'Lord, let Your Word guide my daily choices and direct my path.',
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isRandom = searchParams.get('random') === 'true';
    const indexParam = searchParams.get('index');

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    let verseIndex = dayOfYear % CURATED_DAILY_VERSES.length;

    if (isRandom) {
      verseIndex = Math.floor(Math.random() * CURATED_DAILY_VERSES.length);
    } else if (indexParam !== null) {
      const parsed = parseInt(indexParam, 10);
      if (!isNaN(parsed)) {
        verseIndex = Math.abs(parsed) % CURATED_DAILY_VERSES.length;
      }
    }

    const selected = CURATED_DAILY_VERSES[verseIndex];

    const result: DailyVerse = {
      date: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      ...selected,
    };

    return NextResponse.json({
      success: true,
      dailyVerse: result,
      totalCount: CURATED_DAILY_VERSES.length,
      currentIndex: verseIndex,
    });
  } catch (err: unknown) {
    console.error('GET /api/daily error:', err);
    return NextResponse.json({ error: 'Failed to fetch daily verse' }, { status: 500 });
  }
}
