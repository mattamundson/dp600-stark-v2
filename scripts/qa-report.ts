// QA report — counts, distribution, dupe detection, metadata sanity.
// Run with: pnpm qa
//
// Exits 0 if everything is within thresholds; non-zero if a hard requirement fails.

import { questionBank } from '../src/data/questions';
import { flashcards } from '../src/data/flashcards';
import { scenarios } from '../src/data/scenarios';
import { studyPlan } from '../src/data/studyPlan';
import { DECKS, DOMAINS, type Domain, type Question, type QuestionType } from '../src/lib/schema';
import { similarity } from '../src/lib/utils/similarity';

const SIM_THRESHOLD = 0.85;

interface Issue { severity: 'error' | 'warn'; msg: string }
const issues: Issue[] = [];
const err = (m: string) => issues.push({ severity: 'error', msg: m });
const warn = (m: string) => issues.push({ severity: 'warn', msg: m });

console.log('═'.repeat(72));
console.log('DP-600 Stark V2 — Content QA Report');
console.log('═'.repeat(72));

// ── Counts ───────────────────────────────────────────────────────
const totalQ = questionBank.length;
const byType: Record<QuestionType, number> = {
  single: 0, multi: 0, ordering: 0, 'scenario-single': 0, 'scenario-multi': 0
};
const byDomain: Record<Domain, number> = { maintain: 0, prepare: 0, semantic: 0 };
const bySubtopic: Record<string, number> = {};
let withWhyWrong = 0;
let withFullWhyWrong = 0;

for (const q of questionBank) {
  byType[q.type] += 1;
  byDomain[q.domain] += 1;
  bySubtopic[q.subtopic] = (bySubtopic[q.subtopic] ?? 0) + 1;
  const distractors = (q.options ?? []).filter((o) => !(q.correctOptionIds ?? []).includes(o.id));
  const annotated = distractors.filter((o) => q.whyWrong?.[o.id]).length;
  if (annotated > 0) withWhyWrong += 1;
  if (distractors.length > 0 && annotated === distractors.length) withFullWhyWrong += 1;
}

console.log('\nTotal questions:', totalQ);
console.log('By type:');
for (const t of ['single', 'multi', 'ordering', 'scenario-single', 'scenario-multi'] as const) {
  console.log(`  ${t.padEnd(18)} ${byType[t]}`);
}
const singleEquiv = byType.single + byType['scenario-single'];
const multiEquiv = byType.multi + byType['scenario-multi'];
const scenarioCount = byType['scenario-single'] + byType['scenario-multi'];

console.log(`Single-style total (incl. scenario-single): ${singleEquiv}`);
console.log(`Multi-style total  (incl. scenario-multi):  ${multiEquiv}`);
console.log(`Ordering: ${byType.ordering}`);
console.log(`Scenario-chain (any type): ${scenarioCount}`);

console.log('\nBy domain:');
for (const d of DOMAINS) console.log(`  ${d.padEnd(10)} ${byDomain[d]}`);

console.log('\nWhyWrong coverage:');
const pctAny = totalQ === 0 ? 0 : Math.round((100 * withWhyWrong) / totalQ);
const pctFull = totalQ === 0 ? 0 : Math.round((100 * withFullWhyWrong) / totalQ);
console.log(`  questions with at least one whyWrong: ${withWhyWrong}/${totalQ} (${pctAny}%)`);
console.log(`  questions with FULL whyWrong cover:   ${withFullWhyWrong}/${totalQ} (${pctFull}%)`);

// ── Hard-requirement checks ──────────────────────────────────────
if (totalQ < 220) err(`Total questions ${totalQ} < 220 minimum`);
if (singleEquiv < 120) err(`Single-style questions ${singleEquiv} < 120 minimum`);
if (multiEquiv < 50) err(`Multi-style questions ${multiEquiv} < 50 minimum`);
if (byType.ordering < 20) err(`Ordering questions ${byType.ordering} < 20 minimum`);
if (scenarioCount < 30) err(`Scenario-chain questions ${scenarioCount} < 30 minimum`);
if (pctFull < 80) err(`whyWrong full-coverage ${pctFull}% < 80% minimum`);

// Domain minimums (per the plan)
if (byDomain.prepare < 60) err(`Prepare-domain questions ${byDomain.prepare} < 60 minimum`);
if (byDomain.maintain < 45) err(`Maintain-domain questions ${byDomain.maintain} < 45 minimum`);
if (byDomain.semantic < 45) err(`Semantic-domain questions ${byDomain.semantic} < 45 minimum`);

// ── Duplicate id check ───────────────────────────────────────────
const ids = new Set<string>();
for (const q of questionBank) {
  if (ids.has(q.id)) err(`Duplicate question id: ${q.id}`);
  ids.add(q.id);
}

// ── Required-field check ─────────────────────────────────────────
for (const q of questionBank) {
  if (!q.id || !q.type || !q.domain || !q.subtopic || !q.prompt || !q.explanation) err(`Missing required field on ${q.id}`);
  if (!q.sourceAnchor || !q.sourceAnchor.category || !q.sourceAnchor.note) err(`Missing sourceAnchor on ${q.id}`);
  if (!Array.isArray(q.tags)) err(`Tags not an array on ${q.id}`);
  if ((q.type === 'single' || q.type === 'multi' || q.type === 'scenario-single' || q.type === 'scenario-multi') && (!q.options || !q.correctOptionIds || q.correctOptionIds.length === 0)) {
    err(`Choice question missing options or correctOptionIds: ${q.id}`);
  }
  if (q.type === 'ordering' && (!q.options || !q.correctOrder || q.correctOrder.length !== (q.options ?? []).length)) {
    err(`Ordering question malformed: ${q.id}`);
  }
}

// ── Cross-question link integrity ────────────────────────────────
let withRelated = 0;
let relatedLinks = 0;
for (const q of questionBank) {
  if (!q.relatedIds || q.relatedIds.length === 0) continue;
  withRelated += 1;
  for (const rid of q.relatedIds) {
    relatedLinks += 1;
    if (!ids.has(rid)) err(`Question ${q.id} relatedIds references missing question ${rid}`);
    if (rid === q.id) err(`Question ${q.id} relatedIds points at itself`);
  }
}
console.log(`\nRelated-question links: ${relatedLinks} edges across ${withRelated} questions`);

// ── Scenario integrity ──────────────────────────────────────────
console.log('\nScenarios:', scenarios.length, '(target: 15)');
if (scenarios.length < 15) err(`Scenarios ${scenarios.length} < 15 required`);
const qByScenario: Record<string, number> = {};
for (const q of questionBank) if (q.scenarioId) qByScenario[q.scenarioId] = (qByScenario[q.scenarioId] ?? 0) + 1;
for (const s of scenarios) {
  const got = qByScenario[s.id] ?? 0;
  if (got < 2) err(`Scenario ${s.id} has only ${got} questions (need ≥2)`);
  if (got > 5) warn(`Scenario ${s.id} has ${got} questions (>5)`);
  for (const qid of s.questionIds) {
    if (!questionBank.find((q) => q.id === qid)) err(`Scenario ${s.id} references missing question ${qid}`);
  }
}
console.log('Scenario question counts:');
for (const s of scenarios) console.log(`  ${s.id.padEnd(8)} ${(qByScenario[s.id] ?? 0)} — ${s.title}`);

// ── Flashcards ──────────────────────────────────────────────────
console.log('\nFlashcards:', flashcards.length, '(target: ≥120)');
if (flashcards.length < 120) err(`Flashcards ${flashcards.length} < 120 minimum`);
const byDeck: Record<string, number> = {};
for (const f of flashcards) byDeck[f.deck] = (byDeck[f.deck] ?? 0) + 1;
for (const d of DECKS) console.log(`  ${d.padEnd(22)} ${byDeck[d] ?? 0}`);
const seenIds = new Set<string>();
for (const f of flashcards) {
  if (seenIds.has(f.id)) err(`Duplicate flashcard id: ${f.id}`);
  seenIds.add(f.id);
  if (!f.front || !f.back) err(`Flashcard missing front/back: ${f.id}`);
}

// ── Study plan ──────────────────────────────────────────────────
console.log('\nStudy plan days:', studyPlan.length, '(target: 14)');
if (studyPlan.length !== 14) err(`Study plan ${studyPlan.length} days; expected 14`);
for (let i = 1; i <= 14; i++) {
  if (!studyPlan.find((d) => d.day === i)) err(`Study plan missing day ${i}`);
}

// ── Subtopic distribution ────────────────────────────────────────
console.log('\nTop subtopics by count:');
const sortedSubs = Object.entries(bySubtopic).sort((a, b) => b[1] - a[1]);
for (const [s, n] of sortedSubs.slice(0, 15)) console.log(`  ${s.padEnd(22)} ${n}`);

// ── Near-duplicate prompt detection ──────────────────────────────
console.log('\nDupe scan (Levenshtein > ' + SIM_THRESHOLD + ' on prompts within same domain+subtopic)…');
const groups: Record<string, Question[]> = {};
for (const q of questionBank) {
  const k = `${q.domain}|${q.subtopic}`;
  groups[k] ||= [];
  groups[k].push(q);
}
let dupePairs = 0;
for (const list of Object.values(groups)) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const sim = similarity(list[i].prompt, list[j].prompt);
      if (sim > SIM_THRESHOLD) {
        warn(`Near-duplicate prompts (${sim.toFixed(2)}): ${list[i].id} ↔ ${list[j].id}`);
        dupePairs += 1;
      }
    }
  }
}
console.log(`  Pairs above threshold: ${dupePairs}`);

// ── Issue summary ────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
const errs = issues.filter((i) => i.severity === 'error');
const warns = issues.filter((i) => i.severity === 'warn');
console.log(`Errors: ${errs.length}   Warnings: ${warns.length}`);
for (const i of errs) console.log(`  [ERR ] ${i.msg}`);
for (const i of warns) console.log(`  [WARN] ${i.msg}`);
console.log('═'.repeat(72));

if (errs.length > 0) process.exit(1);
process.exit(0);
