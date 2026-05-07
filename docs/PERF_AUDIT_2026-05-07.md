# DP-600 Stark V2 — Performance Audit (Lighthouse + Bundle)

**Date**: May 7, 2026
**Agent**: 9 of 10 (read-only on src; build/preview/lighthouse + this doc)
**Scope**: prod build (`pnpm build`), local preview at `127.0.0.1:4179`, live deploy at `mattamundson.github.io/dp600-stark-v2/`
**Tooling**: Vite 5.4.21 + tsc, Lighthouse 12.x via npx, Chrome 140 headless mobile simulation

---

## Executive Summary

Status: **BORDERLINE**. Accessibility (96), Best Practices (100), and SEO (90 LIVE / 82 LOCAL) are healthy; Performance scores **63 LIVE / 56 LOCAL** are flagged by a single dominant cause — the `content-questions` chunk (1.65 MB raw / 490 KB gzipped) eagerly loaded on every route entry, pushing FCP/LCP past 4.5s on simulated mobile. CLS of 0.198 LIVE / 0.274 LOCAL is over the 0.1 "Good" threshold and is the second meaningful regression. Both are fixable with code-splitting + grid-skeleton placeholders; no architectural changes required.

---

## Lighthouse Scores

| Category | LIVE (`97bc576`) | LOCAL (post-batch +10 unpushed commits) | Gap |
|---|---:|---:|---:|
| Performance | 63 | 56 | -7 |
| Accessibility | 96 | 96 | 0 |
| Best Practices | 100 | 100 | 0 |
| SEO | 90 | 82 | -8 |
| PWA | (skipped — category deprecated in LH 12) | — | — |

**Note on SEO regression LOCAL → LIVE:** local preview lacks `robots.txt` (vite preview doesn't serve it from `public/`); LIVE serves it correctly. Both fail `meta-description`, which is fixable in `index.html`.

**Note on Performance regression LIVE → LOCAL:** unpushed commits introduce a new dashboard grid (`md:grid-cols-2 lg:grid-cols-4` + `md:grid-cols-2 lg:grid-cols-3 exam-day-hide`) that contributes a second layout shift (+0.076 score), bringing CLS from 0.198 → 0.274 and dropping perf 7 points.

---

## Core Web Vitals (mobile, simulated)

| Metric | LIVE | LOCAL | Target ("Good") | Status |
|---|---:|---:|---|---|
| FCP (First Contentful Paint) | 4.5 s | 4.9 s | ≤ 1.8 s | FAIL |
| LCP (Largest Contentful Paint) | 4.6 s | 4.9 s | ≤ 2.5 s | FAIL |
| TBT (Total Blocking Time) | 0 ms | 0 ms | ≤ 200 ms | PASS |
| CLS (Cumulative Layout Shift) | 0.198 | 0.274 | ≤ 0.1 | FAIL |
| Speed Index | 4.5 s | 4.9 s | ≤ 3.4 s | FAIL |
| TTI (Time to Interactive) | 4.6 s | 4.9 s | ≤ 3.8 s | FAIL |

`INP/FID` not exercised in a synthetic Lighthouse run — TBT=0ms suggests interaction latency would land in "Good" once the SPA is hydrated.

---

## Bundle Breakdown

From `pnpm build` (Vite 5.4.21, prod, gzip enabled):

| Chunk | Raw | Gzip | Notes |
|---|---:|---:|---|
| `content-questions-Bf1QXmiK.js` | **1,649.17 kB** | **490.38 kB** | Eagerly loaded; over 500 KB warning threshold |
| `index-pTh8zGuK.js` | 273.12 kB | 79.13 kB | App shell + router |
| `content-flashcards-CWXNTqqW.js` | 188.29 kB | 57.50 kB | |
| `vendor-react-JlqBpr_m.js` | 165.84 kB | 54.03 kB | React + ReactDOM |
| `content-misc-BLZLQbdg.js` | 114.38 kB | 36.26 kB | |
| `index-ZSNUFlo8.css` | 32.29 kB | 6.89 kB | Tailwind utilities |
| `workbox-window.prod.es5-BqEJf4Xk.js` | 5.71 kB | 2.34 kB | |
| `vendor-idb-Dob3nYDb.js` | 3.37 kB | 1.37 kB | |
| `manifest.webmanifest` | 0.31 kB | — | |
| `index.html` | 1.06 kB | 0.49 kB | |

**Total transfer (cold visit)**: ~728 KiB gzip (Lighthouse measured 716–718 KiB, close match).
**Total cached (PWA precache)**: 12 entries / 2,384.66 KiB raw — covers the SW-cached app shell + content for offline-first repeat visits. Repeat visit transfer should approach 0 once SW is registered.

---

## Top 3 Optimization Opportunities

### 1. Dynamic-import the `content-questions` chunk (highest impact)

**Wins**: ~490 KB shaved off the critical path on cold load. Expected delta: **+15–25 perf points** (FCP 4.5s → ~2.0s, LCP 4.6s → ~2.5s).

**Approach**: The file `src/data/questions.*` (or wherever the 1.65 MB blob originates) is imported eagerly somewhere on the dashboard or app-shell entry. Convert to a route-level lazy import on Quiz / Sim / Cockpit / Review only — the dashboard does not need the question payload to render.

```ts
// Before
import questions from '@/data/questions';

// After (Quiz/Sim/Cockpit only)
const QuizPage = React.lazy(() => import('@/features/quiz/QuizPage'));
// + ensure the questions module is imported only inside QuizPage.tsx, not at app root
```

Wrap with `<Suspense fallback={<QuizSkeleton/>}>` to keep CLS controlled. `QuizSkeleton` should reserve grid cell heights so the lazy load doesn't trigger another shift.

### 2. Eliminate the dashboard grid CLS (0.197 LIVE / 0.274 LOCAL)

**Wins**: ~0.2 CLS reduction → CLS into "Good" band (≤0.1). Expected delta: **+8–12 perf points** + much better real-user feel.

**Approach**: The flagged element is the dashboard's `<section class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">` (and the v2-side `lg:grid-cols-3 exam-day-hide`). Cause: cards render with content-driven heights after IndexedDB attempts/streak data resolves async, pushing the layout. Fix: reserve `min-h-[Npx]` on each card variant (TodayCard, StreakCard, ScoreCard, AttemptsCard) so the initial paint matches the post-data height.

### 3. Inline critical CSS + add `<meta name="description">`

**Wins**: ~200–400 ms FCP improvement; SEO 90 → 100 on both LIVE and LOCAL.

**Approach**: Vite's default extracts all CSS to a single `<link>` (32 kB / 6.9 kB gz). Use `vite-plugin-critical` or hand-inline ≤2 KB of above-the-fold rules into `index.html`. Add `<meta name="description" content="DP-600 exam prep — adaptive quizzing, simulated exam, spaced repetition, 14-day study schedule.">` to `index.html`.

---

## Notes on What Was Skipped or Worked Around

- **PWA Lighthouse category**: Lighthouse 12 deprecated the PWA category. Skipped from this run; PWA correctness verified separately via build output (`generateSW` → 12 precache entries / 2.4 MB) and manifest presence in `dist/manifest.webmanifest`.
- **Lighthouse EPERM noise on cleanup**: Node 24 + chrome-launcher on Windows throws `EPERM` while removing `%LOCALAPPDATA%\Temp\lighthouse.<id>\` after the audit run. **The JSON reports completed and were written successfully before the cleanup error.** Both `tmp-lighthouse-{live,local}.json` (~400 KB each) parsed cleanly. Tooling-fix candidate: pin chrome-launcher >= 1.2.0 or run lighthouse under Node 20 LTS to silence the cleanup error. Not blocking.
- **Cross-check with A11Y_AUDIT_2026-05-07.md**: Lighthouse a11y score of 96 reflects only `color-contrast` failures — Lighthouse cannot detect the icon-only-button and ordering-list keyboard issues called out as HIGH in the manual a11y audit. The two audits are complementary, not duplicative.

---

## Run Provenance

- Build: `pnpm build` → 17.89s, 177 modules, 12 PWA precache entries.
- Preview: `pnpm preview --port 4179` → `http://127.0.0.1:4179/` (vite preview, prod artifacts).
- Lighthouse LIVE: `2026-05-07T08:06:29Z` against `https://mattamundson.github.io/dp600-stark-v2/`.
- Lighthouse LOCAL: `2026-05-07T08:05:18Z` against `http://127.0.0.1:4179/`.
- JSON reports: `tmp-lighthouse-live.json`, `tmp-lighthouse-local.json` (gitignored — temp artifacts; delete or `.gitignore` after consumption).
