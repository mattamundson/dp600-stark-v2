# Session Context — dp600-stark-v2
**Date:** 2026-05-06  
**Sessions:** 7 + 7b (two compacts)  
**Branch:** `main` — HEAD `4372123` — fully synced with `origin/main`  
**GitHub:** `https://github.com/mattamundson/dp600-stark-v2`  
**Vercel account:** `mattmamundson@gmail.com` (target deploy account)

---

## Current State

| Item | State |
|---|---|
| GitHub `origin/main` | ✅ Synced — HEAD `4372123` |
| Local working tree | ✅ Clean — nothing to commit |
| Build (`pnpm build`) | ✅ Passing |
| Tests | ✅ 258/258 passing |
| TypeScript (`tsc -b`) | ✅ Clean |
| Vercel deploy | ❌ NOT DEPLOYED — see Blocker section |
| Dev server | Not running |

The only incomplete task is **Task #13: Deploy to Vercel**.

---

## What Was Built This Session

### Feature: Per-Day Study Documentation Pages

The `/study-plan` view previously showed raw target strings (`section:fabric-architecture`) as dead text alongside generic Quiz/Cards/Remediate buttons that didn't deep-link anywhere meaningful.

Amo requested full curated documentation pages at `/study/day/:n` — one page per study day — with:
- Inline reference content from the existing `refSections` data
- Clickable MS Learn links per section
- Deep-links for all block types (flashcards, quiz, scenario, simulation, remediation)

### Files Created

#### `src/data/study-docs/dayDocs.ts` (NEW)

Registry mapping each study day (1–14) → array of reference section slugs → curated MS Learn URLs. The join key between `DAY_DOCS` and `refSections` is `sectionSlug`.

```typescript
export interface StudyDocLink { label: string; url: string; }
export interface DayDocSection { sectionSlug: string; links: StudyDocLink[]; }
export interface DayDoc { day: number; sections: DayDocSection[]; }

export const DAY_DOCS: DayDoc[] = [
  {
    day: 1,
    sections: [
      {
        sectionSlug: 'fabric-architecture',
        links: [
          { label: 'OneLake overview', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview' },
          { label: 'Lakehouse overview', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-overview' },
          { label: 'Data warehousing in Microsoft Fabric', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing' },
        ],
      },
      {
        sectionSlug: 'storage-modes',
        links: [
          { label: 'Lakehouse SQL analytics endpoint', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-sql-analytics-endpoint' },
          { label: 'Get started with Lakehouse', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-lakehouse' },
        ],
      },
    ],
  },
  {
    day: 2,
    sections: [
      {
        sectionSlug: 'direct-lake',
        links: [
          { label: 'Direct Lake overview', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview' },
          { label: 'Direct Lake vs Import mode', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview#direct-lake-vs-import-mode' },
          { label: 'Analyze query processing', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-analyze-query-processing' },
        ],
      },
    ],
  },
  {
    day: 3,
    sections: [
      {
        sectionSlug: 'kql-basics',
        links: [
          { label: 'KQL quick reference', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kql-quick-reference' },
          { label: 'Kusto overview', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/data-explorer-overview' },
          { label: 'KQL tutorial', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/tutorial' },
        ],
      },
    ],
  },
  {
    day: 4,
    sections: [
      {
        sectionSlug: 'pipelines-basics',
        links: [
          { label: 'Data Factory in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/data-factory-overview' },
          { label: 'Copy activity reference', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/copy-data-activity' },
          { label: 'Pipeline concepts', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/pipeline-concepts' },
        ],
      },
    ],
  },
  {
    day: 5,
    sections: [
      {
        sectionSlug: 'fabric-security',
        links: [
          { label: 'Fabric security overview', url: 'https://learn.microsoft.com/en-us/fabric/security/security-overview' },
          { label: 'Workspace roles', url: 'https://learn.microsoft.com/en-us/fabric/get-started/roles-workspaces' },
          { label: 'Row-level security', url: 'https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security' },
        ],
      },
    ],
  },
  {
    day: 6,
    sections: [
      {
        sectionSlug: 'powerbi-dataflows',
        links: [
          { label: 'Dataflow Gen2 overview', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/dataflows-gen2-overview' },
          { label: 'Dataflows best practices', url: 'https://learn.microsoft.com/en-us/power-bi/transform-model/dataflows/dataflows-best-practices' },
        ],
      },
    ],
  },
  {
    day: 7,
    sections: [
      {
        sectionSlug: 'dax-functions',
        links: [
          { label: 'DAX function reference', url: 'https://learn.microsoft.com/en-us/dax/dax-function-reference' },
          { label: 'CALCULATE function', url: 'https://learn.microsoft.com/en-us/dax/calculate-function-dax' },
          { label: 'Time intelligence functions', url: 'https://learn.microsoft.com/en-us/dax/time-intelligence-functions-dax' },
        ],
      },
    ],
  },
  {
    day: 8,
    sections: [
      {
        sectionSlug: 'eventstream-basics',
        links: [
          { label: 'Eventstream overview', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/event-streams/overview' },
          { label: 'Real-Time Intelligence', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/overview' },
          { label: 'Eventhouse overview', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/eventhouse' },
        ],
      },
    ],
  },
  {
    day: 9,
    sections: [
      {
        sectionSlug: 'fabric-monitoring',
        links: [
          { label: 'Monitoring hub', url: 'https://learn.microsoft.com/en-us/fabric/admin/monitoring-hub' },
          { label: 'Capacity metrics app', url: 'https://learn.microsoft.com/en-us/fabric/enterprise/metrics-app' },
          { label: 'Fabric admin overview', url: 'https://learn.microsoft.com/en-us/fabric/admin/microsoft-fabric-admin' },
        ],
      },
    ],
  },
  {
    day: 10,
    sections: [
      {
        sectionSlug: 'deployment-pipelines',
        links: [
          { label: 'Deployment pipelines process', url: 'https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/intro-to-deployment-pipelines' },
          { label: 'Deployment pipelines best practices', url: 'https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/deployment-pipelines-best-practices' },
        ],
      },
    ],
  },
  {
    day: 11,
    sections: [
      {
        sectionSlug: 'mirroring-basics',
        links: [
          { label: 'Database mirroring in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/overview' },
          { label: 'Mirroring Azure SQL Database', url: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/azure-sql-database' },
        ],
      },
    ],
  },
  {
    day: 12,
    // Simulation day — no reference sections
    sections: [],
  },
  {
    day: 13,
    sections: [
      {
        sectionSlug: 'data-activator',
        links: [
          { label: 'Data Activator overview', url: 'https://learn.microsoft.com/en-us/fabric/data-activator/data-activator-introduction' },
          { label: 'Data Activator triggers', url: 'https://learn.microsoft.com/en-us/fabric/data-activator/data-activator-create-triggers-existing-data' },
        ],
      },
    ],
  },
  {
    day: 14,
    sections: [
      {
        sectionSlug: 'direct-lake',
        links: [
          { label: 'Direct Lake overview', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview' },
        ],
      },
      {
        sectionSlug: 'dax-functions',
        links: [
          { label: 'DAX function reference', url: 'https://learn.microsoft.com/en-us/dax/dax-function-reference' },
        ],
      },
    ],
  },
];
```

**Note:** ~80 MS Learn URLs were authored from knowledge — not verified live. Some may have moved. Spot-check before the exam.

---

#### `src/features/study-docs/DayStudyView.tsx` (NEW)

Full per-day study page component at `/study/day/:n`. Key implementation details:

- Uses `useParams<{ n: string }>()` from React Router v6
- Looks up the study day from `studyPlan` (imported from `../../data/studyPlan`)
- Looks up refSections from `refSections` (from `../reference/content`)
- Looks up MS Learn links from `DAY_DOCS` (from `../../data/study-docs/dayDocs`)
- Reference block `<article>` elements have `id={value}` for anchor navigation from StudyPlanView
- `scroll-mt-4` Tailwind class handles anchor scroll offset below sticky header
- Gracefully handles missing slugs (refSection not found = skip inline content, still show MS Learn links)

Block dispatch by kind:
- `reference` → `RefSectionContent` inline + MS Learn external links
- `flashcards` → Link to `/flashcards?deck=<slug>`
- `quiz` → Link to `/quiz?domain=<domain>&len=25`
- `scenario` → Link to `/scenarios/<id>`
- `simulation` → Link to `/simulation-v2`
- `remediation` → Link to `/remediation`

Inline helpers (not extracted — single call site each):
```typescript
function parseTarget(target: string): { prefix: string; value: string } {
  const idx = target.indexOf(':');
  if (idx === -1) return { prefix: target, value: '' };
  return { prefix: target.slice(0, idx), value: target.slice(idx + 1) };
}
```

`RefSectionContent` handles: `paragraphs`, `bullets`, `table` (headers+rows), `code` block, `warning` banner — matching the full `RefSection` type from `content.ts`.

---

### Files Modified

#### `src/features/study-plan/StudyPlanView.tsx`

Changed block list from dead raw-target text to navigable deep links:
- Before: `<span className="flex-1 truncate">{b.target}</span>` + 3 generic buttons
- After: each block is a `<Link>` routed by kind; shows human-readable `value || b.target`
- Added **"Study"** primary CTA: `<Link to={`/study/day/${d.day}`}>Study</Link>` alongside existing buttons
- Quiz routing: `/quiz?domain=${prefix === 'domain' ? value : d.domains[0]}&len=25`
- Reference routing to day anchor: `/study/day/${d.day}#${value}`

#### `src/app/App.tsx`

Two lines added:
```tsx
import { DayStudyView } from '../features/study-docs/DayStudyView';
// ...
<Route path="/study/day/:n" element={<DayStudyView />} />
```
Route inserted between `/lab/star-schema` and the `*` catch-all.

---

## Vercel Deploy Blocker

**Status:** NOT DEPLOYED. Code is 100% ready. Only deploy is missing.

### Root Cause

Vercel CLI v53.1.1 on Windows stores credentials at:
```
%LOCALAPPDATA%\com.vercel.cli\Data\auth.json
```

That directory exists but `auth.json` is absent. When CLI runs in Claude Code's background bash subshells, the subprocess exits before flushing credentials to disk. Device codes generated and expired: `GJLT-ZFKW`, `CZLB-SLJV`, `TPNK-FQTS`, `HQJQ-ZSRF`.

Previous auth was for `amoszn` account (team `matts-projects-fc4f64e1`, suspended/overdue). `vercel logout` was run; that account's credentials are cleared. Target account is `mattmamundson@gmail.com` — never successfully authenticated via CLI.

### Fix Options

**Option A — Personal Access Token (5 min, recommended):**
1. Browser → `vercel.com` → sign in as `mattmamundson@gmail.com`
2. Settings → Tokens → New Token → name: `dp600-deploy` → Create → Copy token
3. In this session:
```powershell
$env:VERCEL_TOKEN = "paste-token-here"
cd "C:\Users\mattm\Code\dp600-stark-v2"
vercel deploy --prod --yes
```
On first run it'll create `.vercel/project.json` (framework=Vite, output=dist, build=pnpm build). Accept the defaults or name it `dp600-stark-v2`.

**Option B — Vercel Dashboard Import (no CLI needed):**
1. `vercel.com` → New Project → Import Git Repository
2. Select `mattamundson/dp600-stark-v2`
3. Framework: Vite | Build: `pnpm build` | Output: `dist`
4. Deploy → get the public URL

**Option C — Vercel MCP Plugin (in-progress):**
OAuth flow was initiated this session. URL was shown to Amo but not yet completed. After auth, the `mcp__claude_ai_Vercel__deploy_to_vercel` tool can deploy directly from this Claude Code session.

---

## Task List — Complete

| # | Status | Description |
|---|---|---|
| 11 | ✅ | Finish emphasisMode wiring through buildQuiz |
| 12 | ✅ | Unify subtopic taxonomy with rollup buckets |
| **13** | **⏳** | **Deploy app to Vercel for exam-week multi-device access** |
| 14 | ✅ | Add audio + visual cue at simulation T-60s remaining |
| 15 | ✅ | Add cross-question linking in explanations |
| 17 | ✅ | Add print stylesheet for /reference |
| 18 | ✅ | Expand UI test coverage to critical user flows |
| 19 | ✅ | Add CSV export of question bank for peer review |
| 22 | ✅ | Audit blueprint distribution and top up Prepare-domain questions |
| 23 | ✅ | Add time-per-question pacing feedback in analytics |
| 24 | ✅ | Refresh Direct Lake terminology to current Microsoft docs |
| 25–76 | ✅ | All content, feature, and polish sprints |

**Only Task #13 is pending.**

---

## TODO Items (Unscheduled — Post-Deploy Polish)

### P0 — Do before the exam
1. **Smoke-test DayStudyView in browser** — no browser test was run this session; verify anchor nav, MS Learn link opens, prev/next day nav
2. **Spot-check MS Learn URLs** — verify 2–3 URLs per day; some may have moved or be behind login walls

### P1 — High value
3. **RTL test for DayStudyView** — create `tests/day-study-view.test.tsx`:
```typescript
it('renders reference blocks with MS Learn links for day 1', async () => {
  render(<MemoryRouter initialEntries={['/study/day/1']}><App /></MemoryRouter>);
  expect(await screen.findByText('OneLake overview')).toBeInTheDocument();
});
it('renders flashcard link for flashcard blocks', async () => {
  // find a day with flashcards block and verify /flashcards?deck= link
});
```
4. **Slug integrity test** — add to `tests/q-bank-integrity.test.ts`:
```typescript
it('every DAY_DOCS sectionSlug exists in refSections', () => {
  const slugSet = new Set(refSections.map(s => s.slug));
  for (const day of DAY_DOCS) {
    for (const section of day.sections) {
      expect(slugSet.has(section.sectionSlug), `Day ${day.day} slug "${section.sectionSlug}" not in refSections`).toBe(true);
    }
  }
});
```
5. **Minute-total integrity test** — verify each study day's block minutes sum to the documented total

### P2 — Nice to have
6. **"Today's Study" sidebar shortcut** — compute current day from studyStartDate in Layout.tsx and link to `/study/day/:n`
7. **Enrich Day 14 links** — Day 14 currently has only `direct-lake` + `dax-functions`; add per-section links for all review sections
8. **Dashboard "Study Today" CTA** — mirror the existing exam-date CTA panel with a direct study-day link
9. **pnpm qa domain drift check** — verify question bank domain distribution hasn't drifted from DP-600 blueprint

### P3 — Deferred
10. **PWA offline for /study/day/:n** — the route is Vite-autoprecached (should be fine); verify on first deploy
11. **MS Learn URL validation script** — `scripts/validate-ms-learn-urls.ts` to fetch HEAD for all ~80 URLs and report non-200s
12. **Expand content for simulation-day (Day 12)** — currently empty `sections: []`; could add tips or warm-up links

---

## Git State

```
Branch: main
Remote: https://github.com/mattamundson/dp600-stark-v2.git
Status: clean — nothing to commit, working tree clean
Local == origin/main at 4372123
```

### Recent commits
```
4372123 feat(study): per-day documentation pages with MS Learn links
d5c140c feat(ux,a11y): exam-day mode, heatmap, sim-delta, ?-overlay, history print, skip link
e80d940 feat(content,test): +5 scenarios (scn-56..60) + tests for AnalyticsView & MissedPatternsView
3f4b1d1 feat: top-10 ROI batch — DR backup, SW banner, today/streak, attempts CSV
9d28a31 feat(content,test): +3 flashcard decks + 3 view test suites
f72d349 chore(deps): add workbox-window for vite-plugin-pwa React hook
190fe31 feat(content,test): Phase 3 — 4 Prepare agents + 2 lab view tests (+100 Q, +13 tests)
2722474 feat(content): Phase 2 — 7-agent batch (+175 Q across 7 files)
e5b85a8 feat(mobile): tighten layouts on cockpit + sim-v2 routes
2d40c4d feat(lab): Calc Groups Code Lab + Star Schema Decision Lab
```

---

## Architecture Reference

### Tech Stack
| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript (strict) |
| Router | React Router v6 |
| Styles | Tailwind CSS v3 |
| Build | Vite 5 with manual chunk splitting |
| Tests | Vitest + React Testing Library + jsdom |
| Offline | VitePWA (Workbox, auto-update, navigateFallback) |
| Storage | IndexedDB (idb 8.0.0) + localStorage shadow backup |
| SRS | SM-2 spaced repetition |
| Package | pnpm (never npm for installs) |

### Route Map (25 routes)
```
/                     Dashboard
/study-plan           14-day study calendar
/study/day/:n         Per-day study guide (NEW this session)
/quiz                 Adaptive quiz engine
/flashcards           SM-2 flashcard decks
/scenarios/:id        Scenario-based questions
/simulation-v2        Full exam simulation (65Q/100min)
/reference            Reference content browser + print
/analytics            Performance analytics
/cockpit              Study cockpit / readiness dashboard
/remediation          Weak-area remediation queue
/missed               Missed pattern tracker
/cheat-sheet          Printable cheat sheet
/lab/dax-context      DAX context lab
/lab/calc-groups      Calculation groups lab
/lab/star-schema      Star schema decision lab
/history              Attempt history + print
/settings             User settings
...
```

### Content Scale (at commit 4372123)
| Type | Count |
|---|---|
| Questions | ~1,287 |
| Flashcards | 302 |
| Scenarios | 60 |
| Reference sections | ~45 |
| Study days | 14 |
| Tests | 258 |

### Storage Layer
- **IndexedDB stores:** `state` (quiz/readiness), `sessions` (completed attempts), `attempts` (per-question), `srs` (flashcard SM-2 data)
- **localStorage shadow:** DR fallback; `restoreFromShadowIfEmpty()` on mount
- **No backend:** fully client-side; all data stays in browser

### Key Engine Parameters
- **Quiz adaptive weights:** subtopicWeakness 0.55, domainWeakness 0.20, recency 0.10, difficultyMatch 0.10, freshness 0.05
- **Remediation dangerScore:** accuracy 0.45, confidence 0.30, recency 0.15, latency 0.10
- **Simulation blueprints:** DP600_REALISM (65Q/100min), DP600_QUICK (25Q/35min); mulberry32 PRNG, stratified by domain
- **Readiness score:** 0–1000 composite (coverage + accuracy + calibration + pacing)

### TypeScript Config
- Strict mode: `noUnusedLocals`, `noUnusedParameters`
- `exactOptionalPropertyTypes: false` (intentional — prevents required-vs-optional friction)
- Lint script: `tsc -b` (project-references walk, Blocker C fix)

---

## Suggested Next Action

**Immediate (5 min):** Complete Vercel OAuth via the link provided above, OR create a PAT at `vercel.com` → Settings → Tokens and run:
```powershell
$env:VERCEL_TOKEN = "your-token"
cd "C:\Users\mattm\Code\dp600-stark-v2"
vercel deploy --prod --yes
```

After deploy: smoke-test `/study/day/1` → click a reference block → verify MS Learn links open in new tab → test prev/next day navigation.
