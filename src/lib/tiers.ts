// BibleDesk — SaaS Membership & Tier Gatekeeper
// Strict adherence to Rule 8 & Rule 2:
// Scripture reading, concordance search, Strong's lexicons, and TSK cross-refs
// remain 100% free and open forever.
// Paid tiers fund hosted AI compute, real-time multi-device cloud sync, and ministry tools.

export type SubscriptionTier = 'free' | 'pro' | 'ministry' | 'lifetime';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  aiDailyQuota: number;
  features: {
    offlineBible: boolean;
    strongsLexicons: boolean;
    tskCrossReferences: boolean;
    localNotesAndHighlights: boolean;
    byokUnlimitedAi: boolean;
    openMcpAndRestApi: boolean;
    cloudNotesSync: boolean;
    hostedAiNoKeyNeeded: boolean;
    knowledgeGraphExplorer: boolean;
    obsidianVaultExport: boolean;
    pdfStudyGuides: boolean;
    automatedPrayerCareSync: boolean;
    churchMinistryWorkspaces: boolean;
  };
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Community / Open Core',
    tagline: 'Complete, unhindered Bible study for every believer.',
    priceMonthly: 0,
    priceAnnual: 0,
    aiDailyQuota: 5,
    features: {
      offlineBible: true,
      strongsLexicons: true,
      tskCrossReferences: true,
      localNotesAndHighlights: true,
      byokUnlimitedAi: true,
      openMcpAndRestApi: true,
      cloudNotesSync: false,
      hostedAiNoKeyNeeded: false,
      knowledgeGraphExplorer: false,
      obsidianVaultExport: false,
      pdfStudyGuides: false,
      automatedPrayerCareSync: false,
      churchMinistryWorkspaces: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'BibleDesk Pro',
    tagline: 'Deep study superpowers with cloud sync and hosted AI.',
    priceMonthly: 7,
    priceAnnual: 60,
    aiDailyQuota: 250,
    features: {
      offlineBible: true,
      strongsLexicons: true,
      tskCrossReferences: true,
      localNotesAndHighlights: true,
      byokUnlimitedAi: true,
      openMcpAndRestApi: true,
      cloudNotesSync: true,
      hostedAiNoKeyNeeded: true,
      knowledgeGraphExplorer: true,
      obsidianVaultExport: true,
      pdfStudyGuides: true,
      automatedPrayerCareSync: true,
      churchMinistryWorkspaces: false,
    },
  },
  ministry: {
    id: 'ministry',
    name: 'Ministry & Church Leader',
    tagline: 'Collaborative study and pastoral tools for teachers and small groups.',
    priceMonthly: 19,
    priceAnnual: 180,
    aiDailyQuota: 1000,
    features: {
      offlineBible: true,
      strongsLexicons: true,
      tskCrossReferences: true,
      localNotesAndHighlights: true,
      byokUnlimitedAi: true,
      openMcpAndRestApi: true,
      cloudNotesSync: true,
      hostedAiNoKeyNeeded: true,
      knowledgeGraphExplorer: true,
      obsidianVaultExport: true,
      pdfStudyGuides: true,
      automatedPrayerCareSync: true,
      churchMinistryWorkspaces: true,
    },
  },
  lifetime: {
    id: 'lifetime',
    name: 'Kingdom Pioneer',
    tagline: 'Lifetime supporter of open Scripture study technology.',
    priceMonthly: 0,
    priceAnnual: 199,
    aiDailyQuota: 500,
    features: {
      offlineBible: true,
      strongsLexicons: true,
      tskCrossReferences: true,
      localNotesAndHighlights: true,
      byokUnlimitedAi: true,
      openMcpAndRestApi: true,
      cloudNotesSync: true,
      hostedAiNoKeyNeeded: true,
      knowledgeGraphExplorer: true,
      obsidianVaultExport: true,
      pdfStudyGuides: true,
      automatedPrayerCareSync: true,
      churchMinistryWorkspaces: true,
    },
  },
};

export type TierFeature = keyof TierConfig['features'];

/**
 * Resolves the active subscription tier for a user.
 * Self-hosters can set NEXT_PUBLIC_COMMUNITY_MODE='true' or NEXT_PUBLIC_SELF_HOSTED='true'
 * to grant full Pro capabilities to all local users.
 */
export function getUserTier(profile?: {
  subscription_tier?: string | null;
  subscriptionTier?: string | null;
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
} | null): SubscriptionTier {
  // Allow self-hosters to enable Pro mode globally for their church/community
  if (
    typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_SELF_HOSTED === 'true' || process.env.NEXT_PUBLIC_COMMUNITY_MODE === 'true')
  ) {
    return 'pro';
  }

  if (!profile) return 'free';

  const tier = ((profile.subscription_tier ?? profile.subscriptionTier) as SubscriptionTier) || 'free';
  const status = ((profile.subscription_status ?? profile.subscriptionStatus) as SubscriptionStatus) || 'active';

  if (!['active', 'trialing'].includes(status)) {
    return 'free';
  }

  if (tier in TIERS) {
    return tier;
  }

  return 'free';
}

/**
 * Checks whether the given tier permits a specific feature.
 */
export function hasTierFeature(tier: SubscriptionTier, feature: TierFeature): boolean {
  return Boolean(TIERS[tier]?.features[feature]);
}

/**
 * Returns daily server-hosted AI quota based on user tier.
 */
export function getTierAiDailyQuota(tier: SubscriptionTier): number {
  return TIERS[tier]?.aiDailyQuota ?? 5;
}
