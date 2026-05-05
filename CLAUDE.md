# DP-600 Stark V2 Project Rules

## Mission
Build a serious offline-capable DP-600 prep app optimized for exam pass probability.

## Product priorities
1. Content quality
2. Exam realism
3. Adaptive remediation
4. Reliability
5. UX polish

## Engineering rules
- TypeScript everywhere; strict mode on
- Separate logic from UI (logic lives in `src/lib` and `src/features/*/engine.ts`; React components are presentational)
- No giant monolithic files (>500 lines is a smell, >800 is a bug)
- IndexedDB for primary persistence (via `idb`); never `localStorage` for primary state
- No backend, no auth, no paid APIs
- Static app only
- Tests for scoring, remediation, persistence (Vitest + fake-indexeddb)
- Graceful import/export behavior — malformed import surfaces a typed error, never crashes

## Content rules
- Use Microsoft / Fabric terminology exactly as Microsoft Learn uses it
- Favor depth in: Direct Lake, deployment pipelines, DAX context, security/governance, KQL
- No shallow trivia unless it supports a deeper pattern
- No duplicate questions (Levenshtein > 0.85 within domain+subtopic = reject)
- Strong distractors required (every wrong option must be plausible to a non-expert)
- `whyWrong` for every distractor on every question
- `sourceAnchor` references a Microsoft Learn category, not a fake URL

## Delivery rules
- Do not stop after scaffolding
- Do not stop after sample data
- The project is not done until minimum counts AND acceptance criteria are met
- QA pass is mandatory before any "done" claim

## Run commands
- `pnpm install` — first time
- `pnpm dev` — dev server on http://127.0.0.1:5173
- `pnpm test` — Vitest run
- `pnpm build && pnpm preview` — production build + preview
- `pnpm qa` — content QA report (counts, dupes, distribution)
