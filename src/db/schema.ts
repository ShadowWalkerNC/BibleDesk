import {
  pgTable,
  serial,
  text,
  integer,
  real,
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

// ── 2. Scripture Verses (Canonical Bible Text in DB) ─────────────────────────
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

// ── 3. Cross References (Bidirectional Scriptural Network) ───────────────────
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

// ── 4. Evidence-Based Commentary (5-Dimension Grounded) ──────────────────────
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

// ── 5. User Study Notes ──────────────────────────────────────────────────────
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

// ── 6. Study Collections (Notebooks / Thematic Binders) ───────────────────────
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

// ── 7. Collection Items (Saved Verses, CrossRefs, Research in Collections) ───
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

// ── 8. Research Findings (Anthropic Web Search Grounded Insights) ─────────────
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

export type User = typeof users.$inferSelect;
export type ScriptureVerse = typeof scriptureVerses.$inferSelect;
export type CrossReference = typeof crossReferences.$inferSelect;
export type Commentary = typeof commentaries.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type StudyCollection = typeof studyCollections.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type ResearchFinding = typeof researchFindings.$inferSelect;
