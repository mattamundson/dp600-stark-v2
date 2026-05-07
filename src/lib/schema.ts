// Strict types for all DP-600 study content + user state.
// Persisted shapes MUST stay backward-compatible — any breaking
// change requires a migration in `src/lib/storage/db.ts`.

export type Domain = 'maintain' | 'prepare' | 'semantic';
export const DOMAINS: readonly Domain[] = ['maintain', 'prepare', 'semantic'] as const;

export const DOMAIN_LABEL: Record<Domain, string> = {
  maintain: 'Maintain solution',
  prepare: 'Prepare data',
  semantic: 'Semantic models'
};

export const DOMAIN_WEIGHT: Record<Domain, number> = {
  maintain: 0.275,
  prepare: 0.475,
  semantic: 0.275
};

export type QuestionType =
  | 'single'
  | 'multi'
  | 'ordering'
  | 'scenario-single'
  | 'scenario-multi';

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Confidence = 'sure' | 'unsure' | 'guess';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface SourceAnchor {
  category: string; // e.g. 'direct-lake-overview', 'deployment-pipelines'
  note: string;     // short pointer to the relevant doc section
}

export interface Question {
  id: string;
  type: QuestionType;
  domain: Domain;
  subtopic: string;
  difficulty: Difficulty;
  prompt: string;
  scenarioId?: string;
  scenarioTitle?: string;
  options?: QuestionOption[];
  /** correct option ids for single/multi/scenario types */
  correctOptionIds?: string[];
  /** correct order of option ids for ordering type */
  correctOrder?: string[];
  explanation: string;
  /** keyed by option id; explains why each wrong option is wrong */
  whyWrong?: Record<string, string>;
  /** related question IDs surfaced in the explanation panel — builds reasoning chains
   *  by connecting questions that share a trap, mechanism, or cross-domain implication. */
  relatedIds?: string[];
  sourceAnchor: SourceAnchor;
  tags: string[];
}

export interface Scenario {
  id: string;
  title: string;
  domain: Domain;
  business: string;
  prompt: string;
  questionIds: string[];
  tags: string[];
}

export type FlashcardDeck =
  | 'direct-lake'
  | 'direct-lake-traps'
  | 'fabric-architecture'
  | 'deployment-pipelines'
  | 'dax-advanced'
  | 'kql'
  | 'security-governance'
  | 'storage-modes'
  | 'semantic-modeling'
  | 'exam-traps';

export const DECKS: readonly FlashcardDeck[] = [
  'direct-lake',
  'direct-lake-traps',
  'fabric-architecture',
  'deployment-pipelines',
  'dax-advanced',
  'kql',
  'security-governance',
  'storage-modes',
  'semantic-modeling',
  'exam-traps'
] as const;

export const DECK_LABEL: Record<FlashcardDeck, string> = {
  'direct-lake': 'Direct Lake',
  'direct-lake-traps': 'Direct Lake traps',
  'fabric-architecture': 'Fabric architecture',
  'deployment-pipelines': 'Deployment pipelines',
  'dax-advanced': 'DAX advanced',
  kql: 'KQL',
  'security-governance': 'Security & governance',
  'storage-modes': 'Storage modes',
  'semantic-modeling': 'Semantic modeling',
  'exam-traps': 'Exam traps'
};

export interface Flashcard {
  id: string;
  deck: FlashcardDeck;
  front: string;
  back: string;
  tags: string[];
  difficulty: Difficulty;
  sourceAnchor: SourceAnchor;
}

/** SM-2 lite spaced repetition state (persisted per-user, keyed by card id) */
export interface SrsState {
  cardId: string;
  ease: number;       // SM-2 ease factor; starts 2.5
  interval: number;   // current interval in days
  reps: number;       // consecutive correct reps
  due: number;        // epoch ms when next due
  lastSeen: number;   // epoch ms of last review
  lapses: number;     // total times user "again"-d
}

export interface StudyDay {
  day: number;          // 1..14
  title: string;
  focus: string;
  domains: Domain[];
  blocks: Array<{
    kind: 'flashcards' | 'quiz' | 'scenario' | 'simulation' | 'reference' | 'remediation';
    minutes: number;
    target: string;     // e.g. "deck:direct-lake" or "domain:semantic" or "scenario:scn-3"
    notes?: string;
  }>;
}

/* ─── User state persisted in IndexedDB ─────────────────────────── */

export interface Attempt {
  id: string;            // uuid
  questionId: string;
  sessionId: string;
  ts: number;            // epoch ms when answered
  selectedOptionIds: string[];
  selectedOrder?: string[];
  correct: boolean;
  partial?: number;      // 0..1 for multi/ordering partial credit
  latencyMs: number;
  confidence: Confidence;
  domain: Domain;
  subtopic: string;
  difficulty: Difficulty;
}

export type SessionMode =
  | 'quiz-10'
  | 'quiz-25'
  | 'quiz-50'
  | 'simulation'
  | 'scenario'
  | 'remediation-10'
  | 'remediation-15'
  | 'remediation-20'
  | 'flashcard-review';

export interface Session {
  id: string;
  mode: SessionMode;
  startedAt: number;
  finishedAt?: number;
  questionIds: string[];
  /** for simulation we freeze a snapshot so refresh restores exact state */
  snapshot?: {
    timeRemainingMs: number;
    answers: Record<string, { selectedOptionIds?: string[]; selectedOrder?: string[]; confidence?: Confidence }>;
    submitted?: boolean;
    flagged?: string[];
    cursor?: number;
  };
  resultSummary?: SessionResult;
}

export interface SessionResult {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;            // 0..1
  scaledScore: number;         // 0..1000 (transparent formula in scoring/score.ts)
  byDomain: Record<Domain, { total: number; correct: number; accuracy: number }>;
  bySubtopic: Record<string, { total: number; correct: number; accuracy: number }>;
  durationMs: number;
}

/** A subset of weak items the engine has decided to surface */
export interface WeakSpot {
  subtopic: string;
  domain: Domain;
  attempts: number;
  accuracy: number;
  avgLatencyMs: number;
  dangerScore: number;   // confident-but-wrong heuristic (see remediation engine)
  weight: number;        // composite score used for selection
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  examDateIso?: string;  // ISO date the user is targeting
  startedAtIso: string;  // first-launch timestamp
  reduceMotion: boolean;
  showTimer: boolean;
  beepOnFinalMinute: boolean;
  /**
   * Optional emphasis-mode toggle. When set and live (expiresAt > Date.now() AND
   * sessionsRemaining > 0), the quiz engine skews `stratifiedTargets` toward
   * this domain by +0.15 (other two domains shrink proportionally).
   * Decremented by one each time a quiz session is built.
   */
  emphasisMode?: { domain: Domain; expiresAt: number; sessionsRemaining: number };
  /**
   * Controls which exam-realism preset the simulation runner uses.
   * 'dp600'       — full 65 Q / 100 min exam (DP600_REALISM)
   * 'dp600-quick' — 25 Q / 35 min daily rep (DP600_QUICK)
   * 'legacy'      — the previous SimulationView behavior
   * Omitting this field falls back to 'dp600' in SimulationViewV2 and
   * 'legacy' in the old SimulationView (no behavior change for existing users).
   */
  simRealismMode?: 'dp600' | 'dp600-quick' | 'legacy';
  /**
   * Subtopic -> epoch ms when the user marked a missed-pattern group as
   * resolved on /missed. The view filters groups whose most-recent miss is
   * older than this timestamp; a new miss after resolution re-surfaces the
   * group automatically.
   */
  resolvedMissedPatterns?: Record<string, number>;
  /**
   * Exam-day focus mode. When true, the SettingsProvider toggles a
   * `.exam-day` class on `<html>`, which in globals.css hides decorative
   * panels on Dashboard / Cockpit / Analytics so only timer + question +
   * options + flag/skip controls remain. Off by default.
   */
  examDayMode?: boolean;
  /**
   * Minimum attempts on a local-clock day for that day to qualify as a
   * "study day" in the daily-streak counter. Must be >= 1. Defaults to 10
   * when unset (matches the historical hardcoded value).
   *
   * Read this via `getStreakMinAttempts(settings)` in
   * `features/dashboard/streak.ts` and pass the result as the third arg
   * to `studyStreak(attempts, now, threshold)`.
   */
  streakMinAttempts?: number;
}

/** Single object stored under keyPath 'k' = 'state' */
export interface UserStateBlob {
  k: 'state';
  settings: Settings;
  schemaVersion: number;
}

/* ─── Export/import envelope ────────────────────────────────────── */

export interface ExportEnvelope {
  app: 'dp600-stark-v2';
  schemaVersion: number;
  exportedAt: string;
  data: {
    settings: Settings;
    sessions: Session[];
    attempts: Attempt[];
    srs: SrsState[];
  };
}
