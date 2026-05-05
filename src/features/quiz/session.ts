// Adaptive-quiz session driver. Single-question-at-a-time loop with per-answer
// IndexedDB write so refresh resumes where the user left off.

import { uid } from '../../lib/utils/id';
import type {
  Attempt,
  Confidence,
  Question,
  Session,
  SessionMode,
  SessionResult,
  Settings
} from '../../lib/schema';
import { gradeAnswer, summarizeSession } from '../../lib/scoring/score';
import { buildQuiz } from './engine';
import { attemptsBySession, saveAttempt, saveSession } from '../../lib/storage/db';

export interface NewSessionOpts {
  bank: Question[];
  attempts: Attempt[];
  mode: Extract<SessionMode, 'quiz-10' | 'quiz-25' | 'quiz-50' | 'remediation-10' | 'remediation-15' | 'remediation-20'>;
  questionIds?: string[]; // if pre-built (e.g., remediation engine)
  settings?: Settings; // for emphasisMode skew in buildQuiz
}

/**
 * If emphasisMode is currently live, return the patch the caller should persist
 * to decrement sessionsRemaining (or clear when it would hit 0). Returns `null`
 * when no patch is needed. Pure — caller owns the persistence call.
 */
export function emphasisDecrementPatch(settings: Settings | null | undefined): Partial<Settings> | null {
  const em = settings?.emphasisMode;
  if (!em) return null;
  if (em.expiresAt <= Date.now()) return { emphasisMode: undefined };
  if (em.sessionsRemaining <= 0) return { emphasisMode: undefined };
  if (em.sessionsRemaining === 1) return { emphasisMode: undefined };
  return { emphasisMode: { ...em, sessionsRemaining: em.sessionsRemaining - 1 } };
}

export function targetSize(mode: NewSessionOpts['mode']): number {
  switch (mode) {
    case 'quiz-10': return 12;
    case 'quiz-25': return 28;
    case 'quiz-50': return 55;
    case 'remediation-10': return 10;
    case 'remediation-15': return 15;
    case 'remediation-20': return 20;
  }
}

export function startSession(opts: NewSessionOpts): Session {
  const ids = opts.questionIds ?? buildQuiz(opts.bank, opts.attempts, {
    size: targetSize(opts.mode),
    seed: Date.now() & 0xffffffff,
    settings: opts.settings
  });
  return {
    id: uid(opts.mode),
    mode: opts.mode,
    startedAt: Date.now(),
    questionIds: ids,
    snapshot: {
      timeRemainingMs: 0,
      answers: {},
      flagged: [],
      cursor: 0
    }
  };
}

export interface AnswerInput {
  selectedOptionIds?: string[];
  selectedOrder?: string[];
  confidence: Confidence;
  latencyMs: number;
}

export interface AnswerOutcome {
  attempt: Attempt;
  correct: boolean;
  partial: number;
}

export async function answerQuestion(session: Session, q: Question, input: AnswerInput): Promise<AnswerOutcome> {
  const grade = gradeAnswer(q, input.selectedOptionIds, input.selectedOrder);
  const attempt: Attempt = {
    id: uid('a'),
    questionId: q.id,
    sessionId: session.id,
    ts: Date.now(),
    selectedOptionIds: input.selectedOptionIds ?? [],
    selectedOrder: input.selectedOrder,
    correct: grade.correct,
    partial: grade.partial,
    latencyMs: input.latencyMs,
    confidence: input.confidence,
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: q.difficulty
  };
  await saveAttempt(attempt);
  // Mirror into session snapshot so analytics views see the latest state without a refetch race
  if (session.snapshot) {
    session.snapshot.answers[q.id] = {
      selectedOptionIds: input.selectedOptionIds,
      selectedOrder: input.selectedOrder,
      confidence: input.confidence
    };
  }
  await saveSession(session);
  return { attempt, correct: grade.correct, partial: grade.partial };
}

export async function finishSession(session: Session, _attemptsHint: Attempt[], durationMs: number): Promise<SessionResult> {
  // Always read the authoritative attempts from IndexedDB so refresh-mid-session
  // doesn't lose answers from the in-memory `_attemptsHint` array.
  const attempts = await attemptsBySession(session.id);
  const result = summarizeSession(attempts, session.questionIds, durationMs);
  await saveSession({ ...session, finishedAt: Date.now(), resultSummary: result });
  return result;
}
