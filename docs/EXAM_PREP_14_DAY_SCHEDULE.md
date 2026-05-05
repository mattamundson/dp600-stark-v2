# DP-600 — 14-Day Build + Study Cockpit

**Owner:** Amo
**Generated:** 2026-05-05
**Exam target:** 14 days out
**Operating principle:** Add features in **2-prompt sprints**, run audit between each, study daily. Do not bundle 10 prompts. Do not deviate. The app is the means, the score is the end.

---

## Baseline (today, 2026-05-05)

| Metric | Current | Notes |
|---|---|---|
| Total questions | **493** | original target was 380; bank is healthy |
| By domain | Maintain **109 (22.1%)** / Prepare **220 (44.6%)** / Semantic **164 (33.3%)** | **Maintain −5pp under blueprint** (target 27.5%); Semantic +6pp over (target 27.5%) |
| Question types | single 284 / multi 98 / ordering 35 / scenario-single 59 / scenario-multi 17 | healthy mix |
| WhyWrong full coverage | 93% | exceeds 80% bar |
| Scenarios | 31 | 2× the 15-target |
| Flashcards | 165 across 10 decks | exceeds 120-target |
| Cross-question links | 15 edges across 7 questions | new this session |
| Tests | 54/54 | green |
| Build | clean | green |

**Coverage gaps** (top subtopics by drift from exam emphasis):

- Maintain solution domain is 5pp **under** blueprint
- DAX iterators have **no dedicated subtopic** in top-15 (currently buried under `dax-context`)
- Calculation groups have **no dedicated subtopic** (rolled into `dax-context` or `semantic-modeling`)
- `security-ols` is not in top-15 — RLS heavy, OLS thin
- `medallion` has 13 questions — adequate but Microsoft emphasizes this hard
- Star schema patterns are spread across `relationships` (12), `star-schema`, `semantic-model-design` — not a single deep-dive

---

## Mapping the 10 features against current state

| # | Feature | Status |
|---|---|---|
| #1 | Governance and Security mode (30Q + 4 scn + 20 fc + matrix) | **Mostly NEW** — `security-rls` 16Q exists, `security-governance` 14fc exists; need 30 fresh + matrix + analytics tag |
| #2 | Dynamic RLS + Direct Lake security traps (18Q + 2 scn) | **NEW** — 5 modern DL questions exist (dlm2-*) but security cross is thin |
| #3 | Medallion Architecture Decision Lab (25Q + 4 scn + 12 fc) | **Mostly NEW** — 13 medallion Q exist, no decision-lab UI |
| #4 | Fabric Item Selection engine (interactive + 20Q) | **PARTIAL** — `ComponentPickerView` already mounted at `/lab/component-picker`; could top up question pool |
| #5 | DAX Traps and Context Lab (35Q + 10 code-reading + 3 scn) | **PARTIAL** — `dax-context` 22Q + `dax-perf` 13Q exist; need code-reading bias and explicit cheat sheet |
| #6 | Semantic Model Design Clinic (30Q + 3 scn) | **PARTIAL** — `q-semantic-engineering.ts` already covers star/composite/calc-groups; gap is design-checklist + bridge tables |
| #7 | Maintain the Solution mode (25Q + 3 scn + checklist) | **NEW + GAP-CLOSING** — directly addresses Maintain under-rep |
| #8 | Full simulation realism (65Q / 100min / scenario clusters / readiness rating) | **PARTIAL** — full sim already enforces 65/100; gap is scenario clusters + readiness rating |
| #9 | Confidence calibration engine | **PARTIAL** — Sure/Unsure/Guess captured, dangerScore exists; gap is dashboard cards + confidence-ordered remediation |
| #10 | Last 72 Hours cockpit (3 preset sessions + trap sheet) | **NEW** — no equivalent surface today |

| Follow-up | Status |
|---|---|
| Sample DAX for RLS (10Q + 6fc) | NEW — no existing `q-rls-dax.ts` |
| Calculation Groups Code Lab (15Q + 2 scn + 8fc) | **NEW** — `dax-advanced` deck has 18 cards but no calc-group code-lab |
| Star Schema Best Practices (20Q + 3 scn + 10fc) | **PARTIAL** — covered in q-semantic-engineering; gap is dedicated module |
| RLS Testing Mode (12Q + 2 scn + checklist) | NEW |
| DAX Iterators Practice Pack (25Q + 10 code-reading + 2 scn + 10fc) | **NEW + GAP-CLOSING** — no dedicated iterator module |

---

## Re-sequenced 14-day schedule

The user's original schedule assumed a fresh app. Days 1-6 of his schedule are largely already built. The schedule below is **re-sequenced for the actual current state** — gap-closing first, polish last.

### Daily structure

```
Morning build block   08:30–10:30  (90–120 min)  — ONE Claude Code prompt, then audit
Lunch review block    12:00–12:45  (45 min)      — ONE concept area, no app changes
Evening quiz block    18:00–19:30  (90 min)      — flashcards + targeted quiz + remediation
```

After every morning build block, run the **control-prompt audit**:

> Before making any more changes, audit the current app and report:
> - total questions by domain
> - total questions by type
> - total flashcards by deck
> - duplicate or near-duplicate questions found
> - overlapping scenario sets found
> - weak coverage areas still remaining
> Then recommend the next highest-ROI feature to add.

### Day 1 — Tue · Maintain solution top-up (#7) — gap closer

| Block | Time | Action |
|---|---|---|
| Morning | 08:30–10:30 | **Sprint 1**: Run feature prompt — Maintain Solution mode. 25 Q + 3 scenarios + checklist. Target subtopics: monitoring, capacity oversight, lifecycle management, post-deploy validation, governance controls. **Tag every question `domain: 'maintain'`.** |
| Audit | 10:30–10:45 | Run control prompt. Confirm Maintain bumped from 22.1% → ≥25%. |
| Lunch | 12:00–12:45 | Read DP-600 study guide § "Maintain a data analytics solution." Note the 6 sub-skills. |
| Evening | 18:00–19:30 | 10 flashcards (deployment-pipelines deck) → 25-Q Maintain-only quiz → review only the misses. |

### Day 2 — Wed · Governance and Security mode (#1)

| Block | Action |
|---|---|
| Morning | **Sprint 2**: 30 Q + 4 scenarios + 20 flashcards + reference matrix + analytics tag. **Tag heavily `domain: 'maintain'` to keep lifting blueprint.** Subtopics: workspace roles, semantic model permissions, RLS, OLS, sensitivity labels, least-privilege, security tradeoffs. |
| Audit | Confirm Maintain 27%+ now; flashcards ≥185. |
| Lunch | DP-600 study guide § "Manage security and governance" + Microsoft Fabric workspace roles doc. |
| Evening | 20-Q security-only quiz + 8 flashcards (security-governance deck). |

### Day 3 — Thu · Dynamic RLS + Direct Lake security traps (#2)

| Block | Action |
|---|---|
| Morning | **Sprint 3**: 18 Q + 2 scenarios. Cover USERPRINCIPALNAME patterns, dynamic RLS design, semantic vs warehouse RLS placement, **warehouse RLS forces Direct Lake → DirectQuery fallback**. Add reference panel "Direct Lake security traps." |
| Audit | Confirm RLS subtopic doubled; cross-link new Q to existing dlm2-* family. |
| Lunch | Microsoft Learn — Fabric warehouse predicate-based security + semantic-model RLS. |
| Evening | 15 RLS questions + 10 flashcards (dynamic RLS patterns). |

### Day 4 — Fri · DAX Iterators (follow-up #5) + Sample DAX for RLS (follow-up #1)

| Block | Action |
|---|---|
| Morning | **Sprint 4**: 25 iterator Q (10 code-reading) + 10 RLS-DAX Q + 16 flashcards + 2 iterator scenarios. **New subtopic `dax-iterators`** so analytics surfaces it separately. |
| Audit | Confirm `dax-iterators` appears in top-15; total Q ≥568. |
| Lunch | Read SUMX/AVERAGEX/FILTER + context-transition rules. |
| Evening | 25-Q iterator drill (timed, 35-minute cap). |

### Day 5 — Sat · DAX Traps and Context Lab (#5)

| Block | Action |
|---|---|
| Morning | **Sprint 5**: 35 DAX Q (10 code-reading) + 3 scenarios + DAX cheat sheet upgrade in `/reference`. Cover row context, filter context, context transition, CALCULATE behavior, ALL vs ALLSELECTED, WINDOW/INDEX, variables, performance traps. |
| Audit | Confirm code-reading flag set on ≥10 of the new Q. |
| Lunch | DAX context transition deep-dive — read [SQLBI's CALCULATE article] + Microsoft DAX guide. |
| Evening | 25-Q DAX context quiz + 1 scenario chain. |

### Day 6 — Sun · Calculation Groups (follow-up #2) + Star Schema (follow-up #3)

| Block | Action |
|---|---|
| Morning | **Sprint 6 (paired)**: 15 calc-group Q + 20 star-schema Q + 18 flashcards + 5 scenarios. Calc groups: SELECTEDMEASURE, dynamic format strings, time-intel patterns. Star schema: grain definition, surrogate keys, conformed dimensions, bridge tables. |
| Audit | Confirm 200+ semantic-domain Q. |
| Lunch | Microsoft Fabric star-schema guidance + Power BI calc-group docs. |
| Evening | 30-Q modeling quiz (mix). |

### Day 7 — Mon · Semantic Model Design Clinic (#6)

| Block | Action |
|---|---|
| Morning | **Sprint 7**: 30 Q + 3 scenarios + design checklist. Star schema, bridge tables, M:M relationships, composite models, large semantic model storage format, calc groups, dynamic format strings, field parameters. |
| Audit | Bank should now be ≥620 Q. |
| Lunch | Composite-model + bridge-table case studies. |
| Evening | 30-Q semantic-model quiz. |

### Day 8 — Tue · Medallion Architecture Decision Lab (#3)

| Block | Action |
|---|---|
| Morning | **Sprint 8**: 25 Q + 4 scenarios + 12 flashcards + bronze/silver/gold reference panel. Cover layer responsibilities, lakehouse vs warehouse by layer, Delta choices, OneLake org, lineage, source-of-truth design. |
| Audit | Confirm `medallion` subtopic ≥38 Q. |
| Lunch | Microsoft Fabric medallion architecture guide. |
| Evening | 25-Q medallion quiz + 1 scenario chain (scn-09 or new). |

### Day 9 — Wed · RLS Testing Mode (follow-up #4)

| Block | Action |
|---|---|
| Morning | **Sprint 9**: 12 Q + 2 scenarios + RLS testing checklist. Role creation, user/group assignment, role-impersonation testing, admin-context confusion, semantic vs warehouse RLS difference. |
| Audit | Confirm RLS-testing subtopic surfaces in remediation engine. |
| Lunch | Re-read warehouse-RLS quirks + impersonation testing. |
| Evening | 20-Q RLS-targeted remediation. |

### Day 10 — Thu · Confidence Calibration (#9) + Dangerous Weak-Spots upgrade

| Block | Action |
|---|---|
| Morning | **Sprint 10**: Engine work — confidence-adjusted remediation order (confidently-wrong first, then slow, then low-acc), dashboard cards (overconfidence risk, deceptive topic, safe domain). No new questions. |
| Audit | Confirm `dangerousWeakSpots(attempts)` returns the 3 buckets; dashboard panel renders. |
| Lunch | Self-review: recent confidence-mismatch attempts. |
| Evening | 25-Q remediation (confidence-prioritized) + 25-Q domain-balanced slice. |

### Day 11 — Fri · Full Simulation realism (#8) + readiness rating

| Block | Action |
|---|---|
| Morning | **Sprint 11**: Engine work — enforce scenario clusters in simulations (≥5 per sim), post-exam review grouped by domain/subtopic/confidence/danger, **readiness rating** from recent simulations + weak-area trends. |
| Audit | Confirm full sim still 65Q/100min, scenario coverage ≥5 per run. |
| Lunch | Pacing review using `/analytics` PacingPanel. |
| Evening | **First full 65/100 simulation.** |

### Day 12 — Sat · Last 72 Hours cockpit (#10)

| Block | Action |
|---|---|
| Morning | **Sprint 12**: Add `/last-72` route. 3 preset sessions: 20-min rescue, 45-min focused remediation, 100-min full sim. Last-hour checklist in `/reference`. **Do-not-study list** auto-generated from topics with mastery ≥85%. |
| Audit | Confirm cockpit reachable, presets launch correct sessions. |
| Lunch | Build personal trap sheet from misses log (`/history`). |
| Evening | 45-minute focused remediation via cockpit preset. |

### Day 13 — Sun · Pure study + simulation #2

| Block | Action |
|---|---|
| Morning | **No new code.** Read trap sheet + DAX cheat sheet only. |
| Lunch | Active recall on 20 worst-performing flashcards. |
| Evening | **Full 65/100 simulation #2** + 15-min remediation tail. |

### Day 14 — Mon · Last-hour mode (exam day or eve-of)

| Block | Action |
|---|---|
| Morning | 20-min rescue session + read trap sheet (no new content). |
| Lunch | Light review only. 10 flashcards max. **No new material.** |
| Evening | **EXAM** — or one final 65/100 simulation if exam is next morning. |

---

## Daily operating rhythm — explicit hour cadence

```
08:30  ☕  Stand up. Open Claude Code in dp600-stark-v2.
08:30  📋  Read this schedule's row for today. Read yesterday's evening notes.
08:35  🔧  Run today's morning sprint prompt (one prompt only).
       ⏳  Wait for Claude to ship + commit.
10:30  🔍  Run the control-prompt audit. Confirm the metric movement matches the day's goal.
10:45  🛑  Close Claude Code. Switch to study mode.

12:00  🍽️  Lunch + 45-minute concept review (no app changes, no Code).
12:45  🛑  Close all study material.

18:00  📚  Open the app on the study device.
18:00  📇  10 flashcards (deck per the day's row).
18:15  🎯  Today's evening quiz (per the day's row).
       ⏳  Submit. Don't peek at answers between Q.
19:00  📝  Review only the misses. For each: knowledge gap or wording trap?
19:15  🔁  10-Q remediation set built from today's misses.
19:30  🛑  Stop. Log 3 lines: what wrong / why / gap-or-trap.
```

### Hard rules

1. **One sprint per morning.** Two sprints in a single morning will produce duplicate logic and junk content. Use a 2nd sprint only on days explicitly tagged "(paired)" above.
2. **Always run the audit after a sprint.** If the audit shows the metric didn't move (e.g., Maintain still <25% after the Day-1 top-up), the sprint failed — investigate before adding more content.
3. **No app changes during lunch or evening.** Study time is study time. Building during a quiz block dilutes both.
4. **Confidence honesty.** S/U/G is only useful if you actually use them honestly. "Sure but wrong" is the highest-ROI signal in the bank.
5. **No `git push` until exam-prep work is in a stable state.** Branch is currently `+9 ahead of origin/main` and not pushed. Push only when Amo decides on study venue (Vercel deploy is separate task #13).

---

## Backlog state — what's queued

The 15 features above translate to these new tasks. The currently-in-flight task list will get the next sprint added explicitly; the rest live here as the planned roadmap.

| Sprint | Day | Feature | Output |
|---|---|---|---|
| 1 | 1 | Maintain the Solution mode | 25 Q + 3 scn + checklist |
| 2 | 2 | Governance and Security mode | 30 Q + 4 scn + 20 fc + matrix |
| 3 | 3 | Dynamic RLS + DL security traps | 18 Q + 2 scn + reference |
| 4 | 4 | DAX Iterators + RLS-DAX samples | 35 Q + 16 fc + 2 scn |
| 5 | 5 | DAX Traps + Context Lab | 35 Q + 3 scn + cheat sheet |
| 6 | 6 | Calc Groups + Star Schema (paired) | 35 Q + 18 fc + 5 scn |
| 7 | 7 | Semantic Model Design Clinic | 30 Q + 3 scn + checklist |
| 8 | 8 | Medallion Architecture Lab | 25 Q + 4 scn + 12 fc |
| 9 | 9 | RLS Testing Mode | 12 Q + 2 scn + checklist |
| 10 | 10 | Confidence Calibration engine | dashboard + ordering logic |
| 11 | 11 | Full Sim realism + readiness | engine work |
| 12 | 12 | Last 72 Hours cockpit | new route + 3 presets |

**End-of-plan totals (if every sprint ships):**
- Questions: **493 → ~793** (+300)
- Flashcards: **165 → ~245** (+80)
- Scenarios: **31 → ~57** (+26)
- New routes: 2 (`/last-72`, plus simulation review surface)
- New analytics surfaces: 3 (confidence cards, readiness rating, do-not-study list)

---

## Open decisions (Amo to confirm)

- [ ] Exam date confirmed → adjust Day 14 if exam falls on a different weekday
- [ ] Study venue → unblocks #13 Vercel deploy (laptop only? phone/tablet too?)
- [ ] Push branch to `mattamundson/dp600-stark-v2` → currently +9 ahead, not pushed
- [ ] Want auto-mode to keep executing daily sprints, OR review each sprint before approving?
