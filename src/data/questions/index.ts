// Aggregated question bank. Question batches live in subtopic files
// (e.g. q-direct-lake.ts, q-deployment.ts) and are concatenated here.
// Phase 4 fills these batches; the import order is alphabetical and
// has no semantic meaning — engines never trust array order.

import type { Question } from '../../lib/schema';
import { qBatches } from './_batches';

export const questionBank: Question[] = qBatches.flat();

export function questionById(id: string): Question | undefined {
  return questionBank.find((q) => q.id === id);
}

export function questionsByDomain(domain: Question['domain']): Question[] {
  return questionBank.filter((q) => q.domain === domain);
}

export function questionsBySubtopic(subtopic: string): Question[] {
  return questionBank.filter((q) => q.subtopic === subtopic);
}

export function questionsByScenario(scenarioId: string): Question[] {
  return questionBank.filter((q) => q.scenarioId === scenarioId);
}
