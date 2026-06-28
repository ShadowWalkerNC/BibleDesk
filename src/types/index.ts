// BibleDesk — Shared TypeScript Types
// All types used across the app are defined here.

export type TranslationId = 'web' | 'kjv' | 'asv' | 'darby' | 'bbe' | 'ylt';

export interface Translation {
  id: TranslationId;
  name: string;
  description: string;
}

export const TRANSLATIONS: Translation[] = [
  { id: 'web', name: 'World English Bible', description: 'Modern, public domain' },
  { id: 'kjv', name: 'King James Version', description: 'Classic, public domain' },
  { id: 'asv', name: 'American Standard Version', description: 'Literal, public domain' },
];

// ── Bible API ────────────────────────────────────────────────────────────────

export interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BiblePassage {
  reference: string;
  verses: BibleVerse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

// ── AI Answer ────────────────────────────────────────────────────────────────

export interface Dimension {
  title: string;
  content: string;
  citations: string[];       // e.g. ["John 3:16", "Romans 8:28"]
  key_points: string[];      // 2–4 bullet highlights
}

export interface BibleAnswer {
  id: string;                // UUID stored in Supabase
  question: string;
  summary: string;           // 1–2 sentence overview shown above tabs
  dimensions: {
    scripture: Dimension;         // 📖 What the text says
    historical: Dimension;        // 🏗️ Cultural/historical context
    original_language: Dimension; // 🔤 Hebrew/Greek word meanings
    theological: Dimension;       // ✝️ Church teaching & interpretation
    practical: Dimension;         // 🌱 Application to life today
  };
  translation_used: TranslationId;
  confidence: 'high' | 'medium' | 'low';
  disclaimer?: string;
  /**
   * Moderation status set by the pipeline.
   * - 'approved'      — ready to display
   * - 'under_review'  — auto-flagged by Stage 1 (sensitivity_level high or auto_flag true)
   * - 'rejected'      — manually rejected by a moderator
   */
  status: 'approved' | 'under_review' | 'rejected';
  created_at: string;
}

export type DimensionKey = keyof BibleAnswer['dimensions'];

export interface DimensionMeta {
  key: DimensionKey;
  emoji: string;
  label: string;
  color: string;             // CSS custom property name
}

export const DIMENSION_META: DimensionMeta[] = [
  { key: 'scripture',         emoji: '📖', label: 'Scripture',             color: '--dim-scripture' },
  { key: 'historical',        emoji: '🏗️', label: 'Historical Context',  color: '--dim-historical' },
  { key: 'original_language', emoji: '🔤', label: 'Original Language',    color: '--dim-language' },
  { key: 'theological',       emoji: '✝️', label: 'Theological Meaning',  color: '--dim-theological' },
  { key: 'practical',         emoji: '🌱', label: 'Practical Application', color: '--dim-practical' },
];

// ── API Request/Response ─────────────────────────────────────────────────────

export interface AskRequest {
  question: string;
  translation?: TranslationId;
}

export interface AskResponse {
  success: true;
  answer: BibleAnswer;
  /** Short 8-char slug for /share/[slug] — only present on new pipeline answers */
  shareSlug?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: 'RATE_LIMITED' | 'INVALID_INPUT' | 'AI_ERROR' | 'BIBLE_API_ERROR' | 'UNKNOWN';
}

export type ApiResponse = AskResponse | ErrorResponse;
