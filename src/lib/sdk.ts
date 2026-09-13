// BibleDesk — Official Client SDK (app-local entry point)
//
// SOURCE OF TRUTH: `packages/sdk` (the published `@bibledesk/sdk` package).
// This module is a thin re-export so in-app code importing `@/lib/sdk` always
// uses the same client, params, and defaults as the published SDK.
// Do not add a second implementation here — change `packages/sdk/src/index.ts`
// instead. (B06: consolidated; previously this file had drifted — different
// default baseUrl and the same broken `q=`/`text`/`node=` params.)

export * from '../../packages/sdk/src/index';
