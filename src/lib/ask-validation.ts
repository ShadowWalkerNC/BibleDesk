// ask-validation.ts — shared validation rules for the /api/ask endpoints.
//
// Both /api/ask (route.ts) and /api/ask/stream (stream/route.ts) enforce the
// SAME minimum question length via this single constant. Do not re-introduce
// per-route length literals.

/** Minimum question length (characters) enforced by all /api/ask endpoints. */
export const MIN_QUESTION_LENGTH = 5;
