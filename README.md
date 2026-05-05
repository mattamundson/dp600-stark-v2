# DP-600 Stark V2

Production-quality, offline-capable DP-600 (Microsoft Fabric Analytics Engineer) exam-prep web app for senior practitioners.

Not a demo. A serious study product optimized for exam pass probability.

## Run it

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5173
```

Other commands:

```bash
pnpm test         # Vitest — 27 tests across scoring, SRS, remediation, persistence, quiz engine
pnpm qa           # Content QA report (counts, distribution, dupe detection)
pnpm build        # Production build (PWA-ready, offline after first load)
pnpm preview      # Serve the production build at http://127.0.0.1:4173
pnpm lint         # tsc --noEmit
```

## Content snapshot

| Asset             | Count | Minimum | Notes |
|---|---|---|---|
| Questions         | 230   | 220     | Single 148, multi 39+3, ordering 21, scenario 31+3 |
| Flashcards        | 135   | 120     | 9 decks, SM-2 lite spaced repetition |
| Scenarios         | 15    | 15      | 34 chained questions |
| Study-plan days   | 14    | 14      | Days 1–6 prepare, 7–9 maintain, 10–12 semantic, 13 mixed, 14 simulation |
| whyWrong coverage | 97%   | 80%     | Full per-distractor explanation on 221/230 |
| Dupe pairs (Lev > 0.85, same domain+subtopic) | 0 | 0 | Re-checked on every QA run |

Domain distribution (vs blueprint targets):

| Domain            | Questions | Blueprint weight | Question share |
|---|---|---|---|
| Prepare data      | 79        | 47.5%            | 34% (mix balanced for adaptive selector) |
| Maintain solution | 67        | 27.5%            | 29% |
| Semantic models   | 84        | 27.5%            | 37% |

The selector keeps simulation runs blueprint-aligned (weighted to match Microsoft's exam shape) while adaptive quizzes lean toward the user's weak areas.

## Architecture

```
src/
├── app/                       App shell, routing, providers (Settings, Toast)
├── components/                Layout, QuestionPlayer (the reusable runner)
├── features/
│   ├── dashboard/             Readiness + weak spots + bank coverage
│   ├── quiz/                  Adaptive engine + session driver + view
│   ├── simulation/            65-question / 100-min engine + view (refresh-safe)
│   ├── scenarios/             15 scenario sets, chain runner
│   ├── flashcards/            SRS + deck UI
│   ├── remediation/           Weak-area selector + 10/15/20-question runner
│   ├── analytics/             Domain/subtopic accuracy, calibration, trend, sim history
│   ├── study-plan/            14-day plan, day-of focus
│   ├── reference/             Long-form reference + searchable trap library
│   ├── history/               Per-session review with missed answers
│   └── settings/              Theme, exam date, JSON export/import, wipe
├── data/
│   ├── questions/             10 batched files + index
│   ├── flashcards/            135-card deck
│   ├── scenarios/             15-scenario list
│   └── studyPlan/             14-day plan
└── lib/
    ├── schema.ts              Strict types (Question, Flashcard, Session, Attempt, etc.)
    ├── storage/db.ts          IndexedDB via `idb` — settings, sessions, attempts, srs
    ├── scoring/score.ts       Transparent grading + scaled-score formula
    ├── scoring/srs.ts         SM-2 lite spaced repetition
    └── utils/                 ids, time, arrays, levenshtein similarity
```

### Logic / UI separation

Engines (`features/*/engine.ts`, `lib/scoring/*`) are pure TypeScript with no React. They take state + content in, return decisions or grades out. Views (`features/*/View.tsx`) are presentational, holding only ephemeral UI state.

### Persistence

Single IndexedDB database (`dp600-stark-v2`, schema v1) with 4 stores:

- `state` — single blob keyed `'state'` for user settings
- `sessions` — every quiz/simulation/scenario/remediation session, indexed by `mode` and `startedAt`
- `attempts` — every answered question, indexed by `questionId`, `sessionId`, `ts`, `subtopic`, `domain`
- `srs` — SM-2 spaced-repetition state per flashcard, indexed by `due`

Attempts are **denormalized** (`domain`, `subtopic`, `difficulty` copied from the question at write time) so analytics can run without joining against the question bank — and historical attempts survive question rewrites without retroactively shifting accuracy buckets.

### Scoring formula

Documented in `src/lib/scoring/score.ts`. The transparent rules:

**Per question:**

- `single` / `scenario-single`: 1.0 if exact, else 0.
- `multi` / `scenario-multi`: `partial = max(0, jaccard(chosen, correct) − 0.25 × wrongPicks/distractors)`. Counts as "correct" only when `partial == 1`.
- `ordering`: `partial = positionsRight / totalPositions`. Counts as "correct" only when the order matches exactly.

**Per session (0–1000 scaled score):**

```
raw_accuracy        = correct / total
blueprint_weighted  = Σ_d (blueprint_weight_d × accuracy_d) / Σ_d blueprint_weight_d   (only over domains the session covered)
scaled_score        = round(1000 × (0.6 × raw_accuracy + 0.4 × blueprint_weighted))
```

Tunable constants live at the top of the file (`READINESS_RAW_WEIGHT`, `READINESS_BLUEPRINT_WEIGHT`, `PENALTY_PER_WRONG_PICK`).

### Remediation engine

Documented in `src/features/remediation/engine.ts`. Per-subtopic weights:

```
weight = 0.45 × accuracy_signal × sample_confidence
       + 0.30 × confidence_pressure × sample_confidence
       + 0.15 × recency_pressure
       + 0.10 × latency_overrun
```

Where:

- `accuracy_signal = 1 - accuracy` (worse = higher)
- `sample_confidence = 1 - exp(-attempts/5)` (no signal with 0 attempts; ~0.86 at 10)
- `confidence_pressure = mean(confidence_value when wrong)` — the "confidently wrong" multiplier
- `recency_pressure = exp(-days_since_last/14)` — older mistakes fade
- `latency_overrun` — clipped 0..1, share of average latency over difficulty target

Plus a `dangerScore = sure_wrong / max(1, wrong)` flag. The Dashboard and Remediation views call out subtopics where `dangerScore ≥ 0.5` — confidently wrong is the truly dangerous failure mode for an exam.

### Simulation state machine

100-minute timer ticks every second on the client. Snapshots persist to IndexedDB every 10 seconds (and on every interaction). On refresh:

1. Dashboard detects an in-progress simulation via `getActiveSimulation()` and offers a Resume CTA.
2. Reopening `/simulation` automatically rehydrates the session: cursor, answers, flagged set, remaining time.
3. Auto-submit on time=0 is guarded by a `submittingRef` and a `snapshot.submitted` check so it cannot fire twice (e.g. user clicks Submit at the same instant).

### Export / import

Settings → Export JSON dumps `{ app, schemaVersion, exportedAt, data: { settings, sessions, attempts, srs } }`. Import validates the envelope shape (`ImportError` thrown with a typed code on bad input) and replaces the local DB. Malformed JSON, wrong app marker, future schema, or missing arrays all surface a precise error to the toast — they never partially write.

## Keyboard shortcuts

| Where | Key | Action |
|---|---|---|
| Choice question | `1`–`9` | Select option N |
| Choice question | `Enter` / `Space` | Submit / Next |
| Choice question | `S` / `U` / `G` | Set confidence Sure / Unsure / Guess |
| Simulation | `F` | Toggle flag on current question |
| Flashcards | `Space` / `Enter` | Flip card |
| Flashcards | `1` / `2` / `3` / `4` | Grade Again / Hard / Good / Easy (after flip) |
| Flashcards | `J` / `K` | Next / previous card |

## Adding more questions

1. Create a new file under `src/data/questions/q-<topic>.ts`.
2. Use the helpers from `_helpers.ts`:

   ```ts
   import { single, multi, order, SRC } from './_helpers';

   export const myBatch: Question[] = [
     single({
       id: 'tx-001',                     // unique prefix per batch
       domain: 'semantic',
       subtopic: 'direct-lake',
       difficulty: 3,
       prompt: '…',
       options: ['A', 'B', 'C', 'D'],
       correct: 1,                        // index into options
       explanation: '…',
       whyWrong: { 0: '…', 2: '…', 3: '…' },
       source: SRC.directLake,
       tags: ['direct-lake']
     }),
   ];
   ```

3. Add the import + spread in `src/data/questions/_batches.ts`.
4. Run `pnpm qa` to confirm no dupes, full whyWrong coverage, and minimums still met.

Flashcards follow the same pattern in `src/data/flashcards/fc-decks.ts`.

## Tests

Vitest with `fake-indexeddb` for storage. Run: `pnpm test`.

| File | Coverage |
|---|---|
| `tests/persistence.test.ts` | Settings round-trip, export/import round-trip, malformed-import error path |
| `tests/scoring.test.ts` | Single / multi / ordering grading; multi penalty; blueprint-weighted session scoring |
| `tests/srs.test.ts` | SM-2 progression, lapse handling, ease floor |
| `tests/quiz-engine.test.ts` | Stratified targets, weakness biasing, blueprint distribution at sim size |
| `tests/remediation.test.ts` | Cold-start selection, weakest-first ordering, danger flag, requested size honored |

## Known caveats / future work

1. **Bundle size 605 KB single chunk.** Mostly the question bank + flashcards as static JSON. Fine for offline-first (everything precaches in one round-trip) but a `manualChunks` split for first-load perf is a worthwhile follow-up.
2. **Dashboard "Today on plan" links to Study Plan but doesn't surface today's blocks inline.** Day-block expansion on Dashboard is a polish item.
3. **Adaptive selector** uses a fixed weight scheme (constants in `quiz/engine.ts`). A future improvement is a per-user IRT-style ability estimate to pick difficulty more precisely.
4. **Spaced repetition** is SM-2 lite (no FSRS). Adequate for a 14-day window; for longer-term retention, switching to FSRS would improve scheduling accuracy.
5. **Service worker is auto-update on prod build.** Dev mode is intentionally non-PWA to avoid cache pain during development.
6. **Tests do not cover UI components.** Engines and persistence are well-covered; React components are intentionally thin presentational layers.

## Project conventions

See `CLAUDE.md` in the project root.

---

Built for a senior Fabric / Power BI professional who needs to pass DP-600 in 2 weeks. Content depth, exam realism, and adaptive remediation all matter more than UI polish — but the polish is also there.
