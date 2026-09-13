// BibleDesk — Words of Encouragement Data Engine
// Curated biblical promises, pastoral meditations, and artistic/worship reflections.

export type EncouragementCategory =
  | 'calling-creativity'
  | 'peace-anxiety'
  | 'hope-renewal'
  | 'strength-courage'
  | 'healing-comfort'
  | 'grief-loss'
  | 'provision-trust'
  | 'identity-grace';

export interface EncouragementItem {
  id: string;
  category: EncouragementCategory;
  categoryLabel: string;
  reference: string;
  scriptureText: string;
  translation: string;
  theme: string;
  meditation: string;
  prayerStarter: string;
  audienceFocus?: 'worship-artists' | 'pastors' | 'missionaries' | 'general';
}

export interface CategoryMeta {
  id: EncouragementCategory;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const ENCOURAGEMENT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'calling-creativity',
    label: 'Calling & Worship Artistry',
    emoji: '🎵',
    color: '#7c3aed',
    description: 'For worship leaders, songwriters, musicians, artists, and kingdom creatives.',
  },
  {
    id: 'peace-anxiety',
    label: 'Peace & Anxiety Relief',
    emoji: '🕊️',
    color: '#059669',
    description: 'Calm for troubled minds, rest in God’s sovereignty, and freedom from panic.',
  },
  {
    id: 'hope-renewal',
    label: 'Hope & Renewal',
    emoji: '🌅',
    color: '#2563eb',
    description: 'Fresh vision, dawn after the dark night of the soul, and unshakeable expectations.',
  },
  {
    id: 'strength-courage',
    label: 'Strength & Courage',
    emoji: '🛡️',
    color: '#d97706',
    description: 'Fortitude to face spiritual battles, exhaustion, and difficult leadership trials.',
  },
  {
    id: 'healing-comfort',
    label: 'Healing & Restoration',
    emoji: '🌿',
    color: '#0d9488',
    description: 'Restorative balm for physical afflictions, broken spirits, and wounded hearts.',
  },
  {
    id: 'grief-loss',
    label: 'Grief & Consolation',
    emoji: '🕯️',
    color: '#b45309',
    description: 'The tender presence of God near the brokenhearted and mourning.',
  },
  {
    id: 'provision-trust',
    label: 'Provision & Guidance',
    emoji: '🧭',
    color: '#ea580c',
    description: 'Clarity for major life decisions, ministry resources, and daily bread.',
  },
  {
    id: 'identity-grace',
    label: 'Identity & Grace',
    emoji: '👑',
    color: '#4f46e5',
    description: 'Standing firm in your adoption as God’s beloved child with zero condemnation.',
  },
];

export const ENCOURAGEMENT_PROMISES: EncouragementItem[] = [
  // ── Calling & Worship Artistry (Dedicated for Christian music artists, songwriters, creatives) ──
  {
    id: 'art-1',
    category: 'calling-creativity',
    categoryLabel: 'Calling & Worship Artistry',
    reference: 'Exodus 31:3-5',
    scriptureText: 'And I have filled him with the Spirit of God, with wisdom, with understanding, with knowledge and with all kinds of skills—to make artistic designs for work in gold, silver and bronze.',
    translation: 'WEB',
    theme: 'Your Craft is Anointed by God',
    meditation: 'Creativity is not secular until baptized; it is inherently godly because our Creator is the ultimate Artist. When you write lyrics, arrange harmonies, or craft melodies, the Spirit of God imparts divine wisdom and sensitivity. You are not striving in your own strength—the Spirit is filling you with creative revelation to build a sanctuary of praise.',
    prayerStarter: 'Lord, breathe Your Holy Spirit into my creative hands and mind today. Let every chord, lyric, and artistic expression reflect Your radiant majesty and lead others into Your throne room.',
    audienceFocus: 'worship-artists',
  },
  {
    id: 'art-2',
    category: 'calling-creativity',
    categoryLabel: 'Calling & Worship Artistry',
    reference: 'Psalm 33:3',
    scriptureText: 'Sing to him a new song; play skillfully, and shout for joy.',
    translation: 'KJV',
    theme: 'Skill Meets Holy Joy',
    meditation: 'Scripture honors both the discipline of refined craftsmanship ("play skillfully") and the authentic overflow of spiritual adoration ("shout for joy"). If you feel weary of performance pressure or commercial metrics, remember that your primary audience is Jesus Himself. A single heartfelt song that touches His heart has eternal weight.',
    prayerStarter: 'Jesus, free me from the tyranny of human approval, streaming algorithms, or comparison. Teach my hands to play skillfully and my heart to overflow with pure, uncompromised adoration for You.',
    audienceFocus: 'worship-artists',
  },
  {
    id: 'art-3',
    category: 'calling-creativity',
    categoryLabel: 'Calling & Worship Artistry',
    reference: 'Colossians 3:16',
    scriptureText: 'Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit, singing to God with gratitude in your hearts.',
    translation: 'WEB',
    theme: 'Songs that Minister Truth',
    meditation: 'Musical worship is not mere prelude or emotional priming—it is rich theological teaching and pastoral encouragement set to sound. When you craft worship songs rooted in Scripture, you are supplying saints with armor for their darkest days and prayers when words fail them.',
    prayerStarter: 'Father, saturate my writing with Your Word. May the hymns and melodies I release anchor weary souls in truth and declare Your victory across congregations worldwide.',
    audienceFocus: 'worship-artists',
  },

  // ── Peace & Anxiety Relief ──
  {
    id: 'peace-1',
    category: 'peace-anxiety',
    categoryLabel: 'Peace & Anxiety Relief',
    reference: 'Philippians 4:6-7',
    scriptureText: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
    translation: 'WEB',
    theme: 'A Supernatural Garrison for Your Mind',
    meditation: 'Paul wrote these words while chained in a Roman prison. Biblical peace is not the absence of trouble—it is the presence of an almighty Guardian. When panic or racing thoughts press upon you, exchange them through specific thanksgiving. God’s peace will station itself like an elite legion around your heart.',
    prayerStarter: 'Lord, I release this crushing anxiety into Your hands right now. You are sovereign over what I cannot control. Station Your peace around my racing thoughts today.',
    audienceFocus: 'general',
  },
  {
    id: 'peace-2',
    category: 'peace-anxiety',
    categoryLabel: 'Peace & Anxiety Relief',
    reference: 'Psalm 94:19',
    scriptureText: 'When the multitude of my thoughts within me trouble me, your comforts delight my soul.',
    translation: 'ASV',
    theme: 'Quiet for the Overwhelmed Mind',
    meditation: 'When thousands of competing thoughts, deadlines, and fears flood your consciousness, you do not have to untangle them alone. God’s gentle whisper breaks through the noise. Take three slow breaths, still your spirit, and let His affectionate delight wash over your inner being.',
    prayerStarter: "Jesus, silence the swirl of endless 'what-ifs' in my soul. Speak Your comforting truth over my spirit, and let me rest in the security of Your gentle presence.",
    audienceFocus: 'general',
  },

  // ── Hope & Renewal ──
  {
    id: 'hope-1',
    category: 'hope-renewal',
    categoryLabel: 'Hope & Renewal',
    reference: 'Isaiah 40:31',
    scriptureText: 'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    translation: 'WEB',
    theme: 'Soaring on God’s Updraft',
    meditation: 'Eagles do not flap endlessly until exhaustion; they stretch out their wings and catch warm thermals to rise above the raging storm. Waiting on Yahweh is not passive resignation—it is aligning your spiritual wings with the wind of the Holy Spirit. He is exchanging your spent human stamina for His infinite reserves.',
    prayerStarter: 'Yahweh, my energy is spent, but Your strength is boundless. I quiet myself to wait upon You. Lift me above the weariness on the currents of Your Holy Spirit.',
    audienceFocus: 'general',
  },
  {
    id: 'hope-2',
    category: 'hope-renewal',
    categoryLabel: 'Hope & Renewal',
    reference: 'Lamentations 3:22-23',
    scriptureText: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
    translation: 'KJV',
    theme: 'A Clean Slate Every Sunrise',
    meditation: 'Whatever failed yesterday, whatever regret lingers from last week—God’s mercy is freshly minted for you this morning. You are not operating on yesterday’s stale grace. The sun rises with brand-new divine compassion customized for today’s steps.',
    prayerStarter: 'Father, thank You that yesterday’s shortcomings are covered by the blood of Christ. I receive Your fresh mercy this morning and step boldly into today.',
    audienceFocus: 'general',
  },

  // ── Strength & Courage ──
  {
    id: 'strength-1',
    category: 'strength-courage',
    categoryLabel: 'Strength & Courage',
    reference: 'Joshua 1:9',
    scriptureText: 'Haven\'t I commanded you? Be strong and courageous. Don\'t be afraid. Don\'t be dismayed, for Yahweh your God is with you wherever you go.',
    translation: 'WEB',
    theme: 'Courage Born from Companionship',
    meditation: 'God did not command Joshua to conjure up artificial bravery from his own personality. The foundation of courage is the unshakeable reality: "Yahweh your God is with you." You do not walk into rooms alone. You do not step onto platforms or into boardrooms alone. The Lord of Angel Armies goes before you.',
    prayerStarter: 'Lord God, forgive me for shrinking back in fear. You are with me in every step. Fill my spine with holy resolve and steady my heart to obey Your calling without hesitation.',
    audienceFocus: 'pastors',
  },
  {
    id: 'strength-2',
    category: 'strength-courage',
    categoryLabel: 'Strength & Courage',
    reference: '2 Corinthians 12:9',
    scriptureText: 'He said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.',
    translation: 'WEB',
    theme: 'Power Perfected in Weakness',
    meditation: 'Our culture despises limitation, but in the kingdom of God, our recognized insufficiency is the landing strip for divine power. If you feel inadequate for the ministry, family challenge, or mission before you, you are in the exact posture God uses to demonstrate His supernatural glory.',
    prayerStarter: 'Jesus, I boast in my limitations because they invite Your surpassing power. Let Your grace sustain me, and let Your strength shine through every cracked vessel of my life.',
    audienceFocus: 'missionaries',
  },

  // ── Healing & Restoration ──
  {
    id: 'healing-1',
    category: 'healing-comfort',
    categoryLabel: 'Healing & Restoration',
    reference: 'Psalm 147:3',
    scriptureText: 'He heals the broken in heart, and binds up their wounds.',
    translation: 'WEB',
    theme: 'The Master Surgeon of Broken Hearts',
    meditation: 'God does not overlook emotional trauma or inward bleeding. He is not a distant deity who scolds you for hurting. Like a gentle, attentive surgeon, He cleanses painful wounds and wraps His compassionate promises around your fractured heart.',
    prayerStarter: 'Lord Jesus, You know every hidden ache and tear shed in the dark. Touch the places where I have been wounded, bind up my spirit, and restore my soul with Your gentle love.',
    audienceFocus: 'general',
  },

  // ── Grief & Consolation ──
  {
    id: 'grief-1',
    category: 'grief-loss',
    categoryLabel: 'Grief & Consolation',
    reference: 'Psalm 34:18',
    scriptureText: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
    translation: 'WEB',
    theme: 'Drawn Near to the Crushed in Spirit',
    meditation: 'When loss feels devastating and words seem empty, remember that God does not abandon you in grief. Scripture promises He is actually closest when your heart is shattered. You do not have to perform or put on a brave face in His presence; He gathers every tear in His bottle.',
    prayerStarter: 'Heavenly Father, my heart is heavy with sorrow, but I anchor myself in Your nearness. Be my refuge today. Comfort me in ways only Your Holy Spirit can.',
    audienceFocus: 'general',
  },

  // ── Provision & Guidance ──
  {
    id: 'prov-1',
    category: 'provision-trust',
    categoryLabel: 'Provision & Guidance',
    reference: 'Proverbs 3:5-6',
    scriptureText: 'Trust in Yahweh with all your heart, and don\'t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
    translation: 'WEB',
    theme: 'Divine Waymaking in the Unknown',
    meditation: 'You do not need to figure out every year, month, or step ahead. God does not demand that you possess omniscient foresight—only obedient trust. Acknowledge Him in the small, ordinary moments of your day, and He will clear the fog and make crooked ways straight.',
    prayerStarter: 'Lord, I lay down my need to control every outcome. I trust Your wisdom above my limited perspective. Guide my decisions today and direct my steps according to Your perfect will.',
    audienceFocus: 'general',
  },

  // ── Identity & Grace ──
  {
    id: 'ident-1',
    category: 'identity-grace',
    categoryLabel: 'Identity & Grace',
    reference: 'Romans 8:1',
    scriptureText: 'There is therefore now no condemnation for those who are in Christ Jesus, who don\'t walk according to the flesh, but according to the Spirit.',
    translation: 'WEB',
    theme: 'Acquitted, Accepted, and Beloved',
    meditation: 'The enemy of our souls loves to replay past sins and accuse believers of unworthiness. But the court of heaven has issued a final verdict: In Christ Jesus, there is NO condemnation. Not partial, not postponed, but zero. You are fully clothed in the righteous garments of Christ.',
    prayerStarter: 'Lord Jesus, thank You for paying my debt in full on Calvary. I silence every condemning accusation with the blood of the Lamb. I walk today in the glorious liberty of Your beloved child.',
    audienceFocus: 'general',
  }
];

export function getAllEncouragements(): EncouragementItem[] {
  return ENCOURAGEMENT_PROMISES;
}

export function getEncouragementsByCategory(category: string): EncouragementItem[] {
  if (!category || category === 'all') return ENCOURAGEMENT_PROMISES;
  return ENCOURAGEMENT_PROMISES.filter(item => item.category === category);
}

export function searchEncouragements(query: string): EncouragementItem[] {
  if (!query || !query.trim()) return ENCOURAGEMENT_PROMISES;
  const q = query.toLowerCase().trim();
  return ENCOURAGEMENT_PROMISES.filter(
    item =>
      item.reference.toLowerCase().includes(q) ||
      item.theme.toLowerCase().includes(q) ||
      item.scriptureText.toLowerCase().includes(q) ||
      item.meditation.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q)
  );
}
