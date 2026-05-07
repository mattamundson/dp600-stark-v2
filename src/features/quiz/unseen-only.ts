// Unseen-only quiz selection — pure logic, no side effects.
//
// The existing `buildQuiz` engine biases toward weakest subtopics and
// difficulty-band-matched questions. With T-10 days to exam and a 1,287-Q
// bank, the most-impact missing study mode is "questions you've literally
// never seen" — surface 100% novel content rather than reshuffled drill.
//
// Selection rules:
//   - A question is "unseen" iff zero attempts reference its id.
//   - When supply allows, distribute evenly across the three domains
//     (maintain / prepare / semantic) so the user doesn't burn their unseen
//     budget on whichever domain happens to be over-represented in the bank.
//   - When supply is short in a domain, take what's available and overflow
//     the remainder from the other two domains (largest-pool first).
//   - Random sampling within each domain so back-to-back unseen sessions
//     don't return the same N questions.

import type { Attempt, Domain, Question } from '../../lib/schema';
import { DOMAINS } from '../../lib/schema';

/**
 * Returns the IDs of every question with zero attempts. Order matches
 * input order; callers that want a random sample should shuffle.
 */
export function getUnseenQuestionIds(
  allQuestions: readonly Question[],
  attempts: readonly Attempt[]
): string[] {
  const seen = new Set<string>();
  for (const a of attempts) seen.add(a.questionId);
  const out: string[] = [];
  for (const q of allQuestions) {
    if (!seen.has(q.id)) out.push(q.id);
  }
  return out;
}

/**
 * Pick `count` unseen questions, biased toward an even distribution across
 * the three exam domains when supply allows. Uses Math.random — caller can
 * seed via a wrapper if determinism is needed (no consumer requires that
 * today; both quiz views accept fresh randomness per mount).
 *
 * Returns an array of Question objects (not just ids) so the view layer
 * can render directly without a second lookup.
 */
export function selectUnseenQuiz(
  allQuestions: readonly Question[],
  attempts: readonly Attempt[],
  count = 25
): Question[] {
  if (count <= 0) return [];
  const unseenIds = new Set(getUnseenQuestionIds(allQuestions, attempts));
  if (unseenIds.size === 0) return [];

  // Bucket unseen questions by domain.
  const byDomain: Record<Domain, Question[]> = {
    maintain: [],
    prepare: [],
    semantic: []
  };
  for (const q of allQuestions) {
    if (unseenIds.has(q.id)) byDomain[q.domain].push(q);
  }
  for (const d of DOMAINS) shuffleInPlace(byDomain[d]);

  // First pass: even split across domains, capped by supply.
  const perDomain = Math.floor(count / DOMAINS.length);
  const remainder = count - perDomain * DOMAINS.length;
  const picked: Question[] = [];
  const taken: Record<Domain, number> = { maintain: 0, prepare: 0, semantic: 0 };

  for (const d of DOMAINS) {
    const want = perDomain + (taken.maintain + taken.prepare + taken.semantic < remainder ? 1 : 0);
    const slice = byDomain[d].slice(0, want);
    picked.push(...slice);
    taken[d] = slice.length;
  }

  // Overflow pass: any domain that came up short pushes the deficit onto the
  // other domains. Repeat until either we hit `count` or all domains are dry.
  if (picked.length < count) {
    const need = count - picked.length;
    // Flatten leftovers from each domain past what we already took, largest pool first.
    const leftovers: Question[] = [];
    const remainingByDomain = DOMAINS.map((d) => ({
      domain: d,
      pool: byDomain[d].slice(taken[d])
    })).sort((a, b) => b.pool.length - a.pool.length);
    for (const { pool } of remainingByDomain) leftovers.push(...pool);
    picked.push(...leftovers.slice(0, need));
  }

  // Final mix: shuffle so domains aren't presented in blocks.
  shuffleInPlace(picked);
  return picked.slice(0, count);
}

/**
 * Fisher-Yates in-place shuffle. Local because the existing
 * `lib/utils/arr.ts` only exposes a seeded variant.
 */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
