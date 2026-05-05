// Full simulation state machine.
//
// 65 questions, 100 minutes, no per-question feedback until submit.
// State is snapshotted to IndexedDB on every interaction so refresh is non-destructive.

import { uid } from '../../lib/utils/id';
import type { Attempt, Confidence, Question, Session, SessionResult } from '../../lib/schema';
import { gradeAnswer, summarizeSession } from '../../lib/scoring/score';
import { buildQuiz } from '../quiz/engine';
import { saveAttempt, saveSession } from '../../lib/storage/db';

export const SIMULATION_QUESTIONS = 65;
export const SIMULATION_MS = 100 * 60_000;

export function newSimulationSession(bank: Question[]): Session {
  const seed = Date.now() & 0xffffffff;
  const ids = buildQuiz(bank, [], { size: SIMULATION_QUESTIONS, seed, mode: 'simulation' });
  return {
    id: uid('sim'),
    mode: 'simulation',
    startedAt: Date.now(),
    questionIds: ids,
    snapshot: {
      timeRemainingMs: SIMULATION_MS,
      answers: {},
      submitted: false,
      flagged: [],
      cursor: 0
    }
  };
}

export interface SimAnswer {
  selectedOptionIds?: string[];
  selectedOrder?: string[];
  confidence?: Confidence;
}

export function recordAnswer(session: Session, qid: string, answer: SimAnswer, timeRemainingMs: number): Session {
  if (!session.snapshot) throw new Error('Simulation session has no snapshot');
  const cur = session.snapshot.answers[qid] ?? {};
  return {
    ...session,
    snapshot: {
      ...session.snapshot,
      timeRemainingMs,
      answers: { ...session.snapshot.answers, [qid]: { ...cur, ...answer } }
    }
  };
}

export function toggleFlag(session: Session, qid: string): Session {
  if (!session.snapshot) return session;
  const cur = new Set(session.snapshot.flagged ?? []);
  cur.has(qid) ? cur.delete(qid) : cur.add(qid);
  return { ...session, snapshot: { ...session.snapshot, flagged: [...cur] } };
}

export function setCursor(session: Session, cursor: number): Session {
  if (!session.snapshot) return session;
  return { ...session, snapshot: { ...session.snapshot, cursor } };
}

export interface SubmitResult {
  session: Session;
  result: SessionResult;
  attempts: Attempt[];
}

/** Grades all answered questions, writes attempts, updates session.resultSummary. */
export async function submitSimulation(
  session: Session,
  bank: Question[],
  now = Date.now()
): Promise<SubmitResult> {
  if (!session.snapshot) throw new Error('No snapshot to submit');
  const elapsed = SIMULATION_MS - session.snapshot.timeRemainingMs;
  const attempts: Attempt[] = [];
  for (const qid of session.questionIds) {
    const ans = session.snapshot.answers[qid];
    const q = bank.find((x) => x.id === qid);
    if (!q) continue;
    if (!ans || (!ans.selectedOptionIds?.length && !ans.selectedOrder?.length)) {
      // unanswered: do not record an attempt — keep summary's "unanswered" count accurate
      continue;
    }
    const grade = gradeAnswer(q, ans.selectedOptionIds, ans.selectedOrder);
    const a: Attempt = {
      id: uid('a'),
      questionId: q.id,
      sessionId: session.id,
      ts: now,
      selectedOptionIds: ans.selectedOptionIds ?? [],
      selectedOrder: ans.selectedOrder,
      correct: grade.correct,
      partial: grade.partial,
      latencyMs: 0, // simulation does not track per-question latency to keep UI simple
      confidence: ans.confidence ?? 'unsure',
      domain: q.domain,
      subtopic: q.subtopic,
      difficulty: q.difficulty
    };
    attempts.push(a);
    await saveAttempt(a);
  }
  const result = summarizeSession(attempts, session.questionIds, elapsed);
  const finished: Session = {
    ...session,
    finishedAt: now,
    snapshot: { ...session.snapshot, submitted: true },
    resultSummary: result
  };
  await saveSession(finished);
  return { session: finished, result, attempts };
}
