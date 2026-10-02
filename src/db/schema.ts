import {
  pgTable,
  serial,
  text,
  integer,
  real,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { FiveDimensionEvidence, ConfidenceAssessment, SourceCitation } from '@/lib/evidence';

// ── 1. Users ─────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 2. Profiles (Identity + Billing / BYOK tier) ───────────────────────────────
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  churchName: text('church_name'),
  role: text('role').default('member'), // 'member' | 'pastor' | 'admin'
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('inactive'),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  byokGeminiKey: text('byok_gemini_key'), // AES-256 encrypted at rest
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── 3. Scripture Verses (Canonical Bible Text in DB) ─────────────────────────
export const scriptureVerses = pgTable(
  'scripture_verses',
  {
    id: serial('id').primaryKey(),
    translation: text('translation').notNull(), // 'web' | 'kjv' | 'asv'
    book: text('book').notNull(),              // e.g. 'John'
    bookNumber: integer('book_number').notNull(), // 1 - 66
    chapter: integer('chapter').notNull(),
    verse: integer('verse').notNull(),
    text: text('text').notNull(),
  },
  (table) => [
    uniqueIndex('idx_scripture_verse_unique').on(
      table.translation,
      table.book,
      table.chapter,
      table.verse
    ),
    index('idx_scripture_chapter').on(table.translation, table.book, table.chapter),
    index('idx_scripture_book').on(table.translation, table.book),
  ]
);

// ── 4. Cross References (Bidirectional Scriptural Network) ───────────────────
export const crossReferences = pgTable(
  'cross_references',
  {
    id: serial('id').primaryKey(),
    fromBook: text('from_book').notNull(),
    fromChapter: integer('from_chapter').notNull(),
    fromVerse: integer('from_verse').notNull(),
    toBook: text('to_book').notNull(),
    toChapter: integer('to_chapter').notNull(),
    toVerse: integer('to_verse').notNull(),
    votes: integer('votes').default(1).notNull(),
  },
  (table) => [
    index('idx_crossref_from').on(table.fromBook, table.fromChapter, table.fromVerse),
    index('idx_crossref_to').on(table.toBook, table.toChapter, table.toVerse),
  ]
);

// ── 5. Evidence-Based Commentary (5-Dimension Grounded) ──────────────────────
export const commentaries = pgTable(
  'commentaries',
  {
    id: text('id').primaryKey(), // e.g. 'comm_john_1_1'
    verseRef: text('verse_ref').notNull(), // e.g. 'John 1:1'
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    dimensions: jsonb('dimensions').$type<FiveDimensionEvidence>().notNull(),
    confidence: text('confidence').$type<'high' | 'medium' | 'low'>().notNull(),
    confidenceScore: real('confidence_score').notNull(),
    confidenceDerivation: jsonb('confidence_derivation').$type<ConfidenceAssessment>().notNull(),
    citations: jsonb('citations').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_commentary_verse_ref').on(table.verseRef),
  ]
);

// ── 6. User Study Notes ──────────────────────────────────────────────────────
export const studyNotes = pgTable(
  'study_notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    verseRef: text('verse_ref').notNull(), // e.g. 'John 1:1'
    title: text('title').notNull(),
    content: text('content').notNull(),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notes_user').on(table.userId),
    index('idx_notes_user_verse').on(table.userId, table.verseRef),
  ]
);

// ── 7. Study Collections (Notebooks / Thematic Binders) ───────────────────────
export const studyCollections = pgTable(
  'study_collections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').default('#b58414'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_collections_user').on(table.userId),
  ]
);

// ── 8. Collection Items (Saved Verses, CrossRefs, Research in Collections) ───
export const collectionItems = pgTable(
  'collection_items',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id').references(() => studyCollections.id, { onDelete: 'cascade' }).notNull(),
    itemType: text('item_type').$type<'verse' | 'cross_ref' | 'research' | 'commentary'>().notNull(),
    itemRef: text('item_ref').notNull(), // e.g. 'John 1:1' or researchId
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_collection_items_coll').on(table.collectionId),
  ]
);

// ── 9. Research Findings (Anthropic Web Search Grounded Insights) ─────────────
export const researchFindings = pgTable(
  'research_findings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'), // Optional for guest research sessions
    query: text('query').notNull(),
    verseRef: text('verse_ref'),
    summary: text('summary').notNull(),
    dimensions: jsonb('dimensions').$type<FiveDimensionEvidence>().notNull(),
    confidence: text('confidence').$type<'high' | 'medium' | 'low'>().notNull(),
    confidenceScore: real('confidence_score').notNull(),
    confidenceDerivation: jsonb('confidence_derivation').$type<ConfidenceAssessment>().notNull(),
    sources: jsonb('sources').$type<SourceCitation[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_research_query').on(table.query),
    index('idx_research_user').on(table.userId),
  ]
);

// ── 10. Answers (AI Q&A, shareable) ──────────────────────────────────────────
export const answers = pgTable(
  'answers',
  {
    id: text('id').primaryKey(),
    question: text('question').notNull(),
    answerJson: jsonb('answer_json').notNull(),
    translation: text('translation'),
    shareSlug: text('share_slug').unique(),
    status: text('status').default('active'), // 'active' | 'under_review' | 'approved'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_answers_slug').on(table.shareSlug),
    index('idx_answers_created').on(table.createdAt),
  ]
);

// ── 11. Rate Limits ───────────────────────────────────────────────────────────
export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey(), // sha256 bucket key
  namespace: text('namespace').notNull(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
});

// ── 12. Canonical Answers (RAG / pgvector) ────────────────────────────────────
// NOTE: The 'embedding' column uses vector(1536) which requires pgvector extension.
// Drizzle does not have a native vector column type in older versions.
// We store it as text for schema compatibility; the actual column type is set
// via raw SQL migration: ALTER TABLE ... ALTER COLUMN embedding TYPE vector(1536)
export const canonicalAnswers = pgTable(
  'canonical_answers',
  {
    id: text('id').primaryKey(),
    questionHash: text('question_hash').unique().notNull(),
    question: text('question').notNull(),
    answerJson: jsonb('answer_json').notNull(),
    // embedding stored as text in Drizzle schema; actual DB column is vector(1536)
    // managed via raw SQL migration (see drizzle/migrations)
    approvedBy: text('approved_by'),
    voteCount: integer('vote_count').default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_canonical_hash').on(table.questionHash),
  ]
);

// ── 13. Graph Nodes ───────────────────────────────────────────────────────────
export const graphNodes = pgTable(
  'graph_nodes',
  {
    id: text('id').primaryKey(),
    nodeKey: text('node_key').notNull().unique(),
    label: text('label').notNull(),
    description: text('description'),
    category: text('category').notNull(), // NodeCategory
    sourceType: text('source_type').notNull(), // NodeSourceType
    sourceId: text('source_id'),
    dimension: text('dimension'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_graph_nodes_key').on(table.nodeKey),
    index('idx_graph_nodes_category').on(table.category),
  ]
);

// ── 14. Graph Edges ───────────────────────────────────────────────────────────
export const graphEdges = pgTable(
  'graph_edges',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').references(() => graphNodes.id, { onDelete: 'cascade' }).notNull(),
    targetId: text('target_id').references(() => graphNodes.id, { onDelete: 'cascade' }).notNull(),
    relation: text('relation').notNull(), // EdgeRelation
    confidence: text('confidence').notNull(), // EdgeConfidence
    weight: real('weight').default(0.5),
    label: text('label'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_graph_edges_source').on(table.sourceId),
    index('idx_graph_edges_target').on(table.targetId),
    uniqueIndex('idx_graph_edges_unique').on(table.sourceId, table.targetId, table.relation),
  ]
);

// ── 15. Moderation: Flags ─────────────────────────────────────────────────────
export const flags = pgTable(
  'flags',
  {
    id: text('id').primaryKey(),
    answerId: text('answer_id').references(() => answers.id, { onDelete: 'cascade' }).notNull(),
    question: text('question').notNull(),
    flagType: text('flag_type').$type<'auto' | 'user'>().notNull(),
    flagReason: text('flag_reason'),
    status: text('status').default('pending'), // 'pending' | 'approved' | 'rejected'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_flags_status').on(table.status),
    index('idx_flags_answer').on(table.answerId),
  ]
);

// ── 16. Moderation: Votes ─────────────────────────────────────────────────────
export const moderationVotes = pgTable(
  'moderation_votes',
  {
    id: text('id').primaryKey(),
    flagId: text('flag_id').references(() => flags.id, { onDelete: 'cascade' }).notNull(),
    moderatorId: text('moderator_id').notNull(),
    vote: text('vote').$type<'accurate' | 'inaccurate'>().notNull(),
    correction: text('correction'),
    scriptureRefs: jsonb('scripture_refs').$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mod_votes_flag').on(table.flagId),
  ]
);

// ── 17. Moderators ────────────────────────────────────────────────────────────
export const moderators = pgTable(
  'moderators',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role').default('moderator'), // 'moderator' | 'admin'
    active: boolean('active').default(false).notNull(),
    invitedBy: text('invited_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ── 18. Flagged Topics (Auto-flag keyword list) ───────────────────────────────
export const flaggedTopics = pgTable('flagged_topics', {
  id: text('id').primaryKey(),
  keyword: text('keyword').notNull(),
  category: text('category').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 19. Bookmarks ─────────────────────────────────────────────────────────────
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    answerId: text('answer_id').notNull(),
    shareSlug: text('share_slug').notNull(),
    question: text('question').notNull(),
    summary: text('summary'),
    translation: text('translation'),
    confidence: text('confidence'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bookmarks_user').on(table.userId),
    index('idx_bookmarks_answer').on(table.answerId),
    uniqueIndex('idx_bookmarks_user_answer').on(table.userId, table.answerId),
  ]
);

// ── 20. Prayer Care: Contacts ─────────────────────────────────────────────────
export const prayerContacts = pgTable(
  'prayer_contacts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    displayName: text('display_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    category: text('category').default('friend'),
    isSensitive: boolean('is_sensitive').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_prayer_contacts_user').on(table.userId),
  ]
);

// ── 21. Prayer Care: Commitments ──────────────────────────────────────────────
export const prayerCommitments = pgTable(
  'prayer_commitments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    contactId: text('contact_id').references(() => prayerContacts.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    privateDetails: text('private_details'),
    scheduleKind: text('schedule_kind').notNull(), // 'daily' | 'weekly' | 'monthly' | 'one_time'
    timezone: text('timezone').notNull(),
    localTime: text('local_time').notNull(),
    nextDueAt: timestamp('next_due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: text('status').default('active'), // 'active' | 'paused' | 'answered' | 'archived'
    googleEventId: text('google_event_id'),
    googleEventLink: text('google_event_link'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_prayer_commitments_user').on(table.userId),
    index('idx_prayer_commitments_contact').on(table.contactId),
  ]
);

// ── 22. Prayer Care: Check-ins ─────────────────────────────────────────────────
export const prayerCheckins = pgTable(
  'prayer_checkins',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    commitmentId: text('commitment_id').references(() => prayerCommitments.id, { onDelete: 'cascade' }).notNull(),
    outcome: text('outcome').notNull(), // 'prayed' | 'snoozed' | 'skipped' | 'answered'
    privateNote: text('private_note'),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
    nextDueAt: timestamp('next_due_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prayer_checkins_commitment').on(table.commitmentId),
    index('idx_prayer_checkins_user').on(table.userId),
  ]
);

// ── 23. Prayer Care: Follow-ups ───────────────────────────────────────────────
export const prayerFollowups = pgTable(
  'prayer_followups',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    contactId: text('contact_id').references(() => prayerContacts.id, { onDelete: 'cascade' }).notNull(),
    checkinId: text('checkin_id').references(() => prayerCheckins.id, { onDelete: 'cascade' }),
    channel: text('channel').default('email'), // 'email' | 'sms' | 'whatsapp' | 'clipboard'
    recipient: text('recipient').notNull(),
    subject: text('subject'),
    message: text('message').notNull(),
    status: text('status').default('draft'), // 'draft' | 'approved' | 'external_draft' | 'sent' | 'failed' | 'dismissed'
    googleDraftId: text('google_draft_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_prayer_followups_user').on(table.userId),
    index('idx_prayer_followups_contact').on(table.contactId),
  ]
);

// ── 24. Prayer Care: Notification Preferences ──────────────────────────────────
export const prayerNotificationPreferences = pgTable(
  'prayer_notification_preferences',
  {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    timezone: text('timezone').notNull(),
    quietHoursStart: text('quiet_hours_start'), // HH:MM
    quietHoursEnd: text('quiet_hours_end'), // HH:MM
    browserEnabled: boolean('browser_enabled').default(false).notNull(),
    emailEnabled: boolean('email_enabled').default(false).notNull(),
    digestMode: text('digest_mode').default('individual'), // 'individual' | 'daily_digest'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  }
);

// ── 25. Google Connections ────────────────────────────────────────────────────
export const googleConnections = pgTable(
  'google_connections',
  {
    ownerId: text('owner_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    googleAccountEmail: text('google_account_email').notNull(),
    encryptedAccessToken: text('encrypted_access_token').notNull(),
    encryptedRefreshToken: text('encrypted_refresh_token'),
    tokenExpiresAt: text('token_expires_at'),
    scopes: jsonb('scopes').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  }
);

// ── 26. Verse Highlights ──────────────────────────────────────────────────────
export const verseHighlights = pgTable(
  'verse_highlights',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    reference: text('reference').notNull(),
    color: text('color').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_verse_highlights_user_ref').on(table.userId, table.reference),
  ]
);

// ── 27. Verse Notes ───────────────────────────────────────────────────────────
export const verseNotes = pgTable(
  'verse_notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    reference: text('reference').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_verse_notes_user_ref').on(table.userId, table.reference),
  ]
);

// ── 28. Churches ──────────────────────────────────────────────────────────────
export const churches = pgTable(
  'churches',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    denomination: text('denomination'),
    city: text('city'),
    stateProvince: text('state_province'),
    country: text('country'),
    website: text('website'),
    contactEmail: text('contact_email'),
    phone: text('phone'),
    inviteCode: text('invite_code').unique().notNull(),
    adminUserId: text('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
    memberCount: integer('member_count').default(1),
    isVerified: boolean('is_verified').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_churches_city_country').on(table.city, table.country),
  ]
);

// ── 29. Church Members ─────────────────────────────────────────────────────────
export const churchMembers = pgTable(
  'church_members',
  {
    id: text('id').primaryKey(),
    churchId: text('church_id').references(() => churches.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').default('member'), // 'pastor' | 'elder' | 'staff' | 'intercessor' | 'member'
    email: text('email'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_church_members_user').on(table.userId),
    index('idx_church_members_church').on(table.churchId),
    uniqueIndex('idx_church_members_unique').on(table.churchId, table.userId),
  ]
);

// ── 30. Public Prayer Requests ──────────────────────────────────────────────────
// Fail-closed defaults: submissions start 'pending' + private; nothing is public
// or atlas-visible until explicitly approved / consented.
export const prayerRequests = pgTable(
  'prayer_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: text('display_name').notNull(),
    request: text('request').notNull(),
    likesCount: integer('likes_count').default(0).notNull(),
    countryCode: text('country_code'),
    countryName: text('country_name'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    category: text('category').default('community'),
    privacyMode: text('privacy_mode').default('approximate'), // 'approximate' | 'precise' | 'restricted'
    isRestricted: boolean('is_restricted').default(false).notNull(),
    isRestrictedRegion: boolean('is_restricted_region').default(false).notNull(),
    escalationLevel: text('escalation_level').default('private'), // 'private' | 'circle' | 'church' | 'atlas'
    urgencyLevel: text('urgency_level').default('normal'), // 'low' | 'normal' | 'urgent' | 'crisis'
    churchId: text('church_id').references(() => churches.id, { onDelete: 'set null' }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    isPublic: boolean('is_public').default(true).notNull(),
    consentAtlas: boolean('consent_atlas').default(false).notNull(),
    status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'held'
    escalationNote: text('escalation_note'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_prayer_requests_public_approved').on(table.isPublic, table.status),
    index('idx_prayer_requests_atlas').on(table.consentAtlas),
    index('idx_prayer_requests_escalation').on(table.escalationLevel),
    index('idx_prayer_requests_church').on(table.churchId),
    index('idx_prayer_requests_user').on(table.userId),
    index('idx_prayer_requests_country').on(table.countryCode),
    index('idx_prayer_requests_category').on(table.category),
  ]
);

// ── 31. Prayer Engagements ──────────────────────────────────────────────────────
export const prayerEngagements = pgTable(
  'prayer_engagements',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').references(() => prayerRequests.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    userHash: text('user_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prayer_engagements_request').on(table.requestId),
  ]
);

// ── 32. Prayer Updates ──────────────────────────────────────────────────────────
export const prayerUpdates = pgTable(
  'prayer_updates',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').references(() => prayerRequests.id, { onDelete: 'cascade' }),
    updateText: text('update_text'),
    isAnswered: boolean('is_answered').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prayer_updates_request').on(table.requestId),
  ]
);

// ── 33. Missionary Profiles ─────────────────────────────────────────────────────
export const missionaryProfiles = pgTable('missionary_profiles', {
  id: text('id').primaryKey(),
  displayName: text('display_name'),
  isRestrictedRegion: boolean('is_restricted_region').default(false),
  locationTier: text('location_tier').default('country_only'),
  locationLabel: text('location_label'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 34. Sermon Notes ────────────────────────────────────────────────────────────
export const sermonNotes = pgTable(
  'sermon_notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sermon_notes_user').on(table.userId),
  ]
);

// ── 35. Creator Profiles ────────────────────────────────────────────────────────
export const creatorProfiles = pgTable(
  'creator_profiles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    handle: text('handle').unique().notNull(),
    displayName: text('display_name').notNull(),
    tagline: text('tagline').notNull(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    bannerUrl: text('banner_url'),
    category: text('category').default('worship').notNull(),
    location: text('location'),
    churchAffiliation: text('church_affiliation'),
    seasonVerse: jsonb('season_verse').default({}),
    featuredMedia: jsonb('featured_media').default([]),
    socialLinks: jsonb('social_links').default([]),
    patronageLinks: jsonb('patronage_links').default([]),
    prayerRequestsJson: jsonb('prayer_requests').default([]),
    featuredSermonIds: jsonb('featured_sermon_ids').default([]),
    isVerified: boolean('is_verified').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_creator_profiles_user').on(table.userId),
    index('idx_creator_profiles_category').on(table.category),
  ]
);

// ── Type exports ──────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type ScriptureVerse = typeof scriptureVerses.$inferSelect;
export type CrossReference = typeof crossReferences.$inferSelect;
export type Commentary = typeof commentaries.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type StudyCollection = typeof studyCollections.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type ResearchFinding = typeof researchFindings.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type RateLimit = typeof rateLimits.$inferSelect;
export type CanonicalAnswer = typeof canonicalAnswers.$inferSelect;
export type GraphNode = typeof graphNodes.$inferSelect;
export type GraphEdge = typeof graphEdges.$inferSelect;
export type Flag = typeof flags.$inferSelect;
export type ModerationVote = typeof moderationVotes.$inferSelect;
export type Moderator = typeof moderators.$inferSelect;
export type FlaggedTopic = typeof flaggedTopics.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type PrayerContact = typeof prayerContacts.$inferSelect;
export type PrayerCommitment = typeof prayerCommitments.$inferSelect;
export type PrayerCheckin = typeof prayerCheckins.$inferSelect;
export type PrayerFollowup = typeof prayerFollowups.$inferSelect;
export type PrayerNotificationPreference = typeof prayerNotificationPreferences.$inferSelect;
export type GoogleConnection = typeof googleConnections.$inferSelect;
export type VerseHighlight = typeof verseHighlights.$inferSelect;
export type VerseNote = typeof verseNotes.$inferSelect;
export type Church = typeof churches.$inferSelect;
export type ChurchMember = typeof churchMembers.$inferSelect;
export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type PrayerEngagement = typeof prayerEngagements.$inferSelect;
export type PrayerUpdate = typeof prayerUpdates.$inferSelect;
export type MissionaryProfile = typeof missionaryProfiles.$inferSelect;
export type SermonNote = typeof sermonNotes.$inferSelect;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
