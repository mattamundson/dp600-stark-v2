// IndexedDB persistence — the only place the app touches storage.
// All consumers go through the typed helpers below.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Attempt,
  ExportEnvelope,
  Session,
  Settings,
  SrsState,
  UserStateBlob
} from '../schema';

export const DB_NAME = 'dp600-stark-v2';
export const SCHEMA_VERSION = 1;

interface DPDB extends DBSchema {
  state: {
    key: string;          // always 'state'
    value: UserStateBlob;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-mode': string; 'by-startedAt': number };
  };
  attempts: {
    key: string;
    value: Attempt;
    indexes: {
      'by-question': string;
      'by-session': string;
      'by-ts': number;
      'by-subtopic': string;
      'by-domain': string;
    };
  };
  srs: {
    key: string;          // cardId
    value: SrsState;
    indexes: { 'by-due': number };
  };
}

let dbPromise: Promise<IDBPDatabase<DPDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<DPDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DPDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'k' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('by-mode', 'mode');
          s.createIndex('by-startedAt', 'startedAt');
        }
        if (!db.objectStoreNames.contains('attempts')) {
          const a = db.createObjectStore('attempts', { keyPath: 'id' });
          a.createIndex('by-question', 'questionId');
          a.createIndex('by-session', 'sessionId');
          a.createIndex('by-ts', 'ts');
          a.createIndex('by-subtopic', 'subtopic');
          a.createIndex('by-domain', 'domain');
        }
        if (!db.objectStoreNames.contains('srs')) {
          const r = db.createObjectStore('srs', { keyPath: 'cardId' });
          r.createIndex('by-due', 'due');
        }
      }
    });
  }
  return dbPromise;
}

// for tests
export function _resetDbForTests(): void {
  dbPromise = null;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SHADOW_KEY_ATTEMPTS);
      localStorage.removeItem(SHADOW_KEY_SESSIONS);
    }
  } catch {
    /* noop */
  }
}

/* ─── Shadow backup to localStorage (pre-exam DR) ────────────────────
 * Browser storage clears (DevTools "Clear site data", profile reset,
 * extension misbehavior) wipe IndexedDB but typically also localStorage.
 * The shadow is not a true backup — it's belt-and-suspenders against
 * an IndexedDB-specific corruption that leaves localStorage intact.
 * Restore is automatic on next load when attempts table is empty.
 */
const SHADOW_KEY_ATTEMPTS = 'stark-v2:shadow:attempts';
const SHADOW_KEY_SESSIONS = 'stark-v2:shadow:sessions';
const SHADOW_FLUSH_MS = 500;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushShadow(): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;
    const db = await getDb();
    const [attempts, sessions] = await Promise.all([
      db.getAll('attempts'),
      db.getAllFromIndex('sessions', 'by-startedAt')
    ]);
    localStorage.setItem(SHADOW_KEY_ATTEMPTS, JSON.stringify(attempts));
    localStorage.setItem(SHADOW_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    // localStorage quota exceeded or db error — DR is best-effort
    console.warn('[stark-v2] shadow flush failed', e);
  }
}

function scheduleShadowFlush(): void {
  if (typeof window === 'undefined') return;
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushShadow();
  }, SHADOW_FLUSH_MS);
}

/**
 * Restore attempts/sessions from localStorage if IndexedDB is empty.
 * Called once on app mount. Returns counts restored, or null if no-op.
 */
export async function restoreFromShadowIfEmpty(): Promise<{ attempts: number; sessions: number } | null> {
  try {
    if (typeof localStorage === 'undefined') return null;
    const db = await getDb();
    const attemptsCount = await db.count('attempts');
    if (attemptsCount > 0) return null;
    const aRaw = localStorage.getItem(SHADOW_KEY_ATTEMPTS);
    const sRaw = localStorage.getItem(SHADOW_KEY_SESSIONS);
    if (!aRaw && !sRaw) return null;
    let attempts: Attempt[] = [];
    let sessions: Session[] = [];
    try {
      if (aRaw) attempts = JSON.parse(aRaw) as Attempt[];
      if (sRaw) sessions = JSON.parse(sRaw) as Session[];
    } catch {
      return null;
    }
    if (attempts.length === 0 && sessions.length === 0) return null;
    const tx = db.transaction(['attempts', 'sessions'], 'readwrite');
    for (const a of attempts) await tx.objectStore('attempts').put(a);
    for (const s of sessions) await tx.objectStore('sessions').put(s);
    await tx.done;
    return { attempts: attempts.length, sessions: sessions.length };
  } catch (e) {
    console.warn('[stark-v2] shadow restore failed', e);
    return null;
  }
}

/* ─── settings ──────────────────────────────────────── */

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  reduceMotion: false,
  showTimer: true,
  beepOnFinalMinute: true,
  startedAtIso: new Date().toISOString()
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const blob = await db.get('state', 'state');
  if (!blob) {
    const initial: UserStateBlob = { k: 'state', settings: DEFAULT_SETTINGS, schemaVersion: SCHEMA_VERSION };
    await db.put('state', initial);
    return initial.settings;
  }
  return blob.settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = await getDb();
  const blob = (await db.get('state', 'state')) ?? {
    k: 'state' as const,
    settings: DEFAULT_SETTINGS,
    schemaVersion: SCHEMA_VERSION
  };
  blob.settings = { ...blob.settings, ...patch };
  await db.put('state', blob);
  return blob.settings;
}

/* ─── sessions ──────────────────────────────────────── */

export async function saveSession(s: Session): Promise<void> {
  const db = await getDb();
  await db.put('sessions', s);
  scheduleShadowFlush();
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb();
  return db.get('sessions', id);
}

export async function listSessions(limit = 100): Promise<Session[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('sessions', 'by-startedAt');
  return all.reverse().slice(0, limit);
}

export async function getActiveSimulation(): Promise<Session | undefined> {
  const db = await getDb();
  const sims = await db.getAllFromIndex('sessions', 'by-mode', 'simulation');
  return sims
    .filter((s) => !s.finishedAt && s.snapshot && !s.snapshot.submitted)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
}

/* ─── attempts ──────────────────────────────────────── */

export async function saveAttempt(a: Attempt): Promise<void> {
  const db = await getDb();
  await db.put('attempts', a);
  scheduleShadowFlush();
}

export async function listAttempts(): Promise<Attempt[]> {
  const db = await getDb();
  return db.getAll('attempts');
}

export async function attemptsBySession(sessionId: string): Promise<Attempt[]> {
  const db = await getDb();
  return db.getAllFromIndex('attempts', 'by-session', sessionId);
}

export async function attemptsByQuestion(qid: string): Promise<Attempt[]> {
  const db = await getDb();
  return db.getAllFromIndex('attempts', 'by-question', qid);
}

/* ─── SRS ───────────────────────────────────────────── */

export async function getSrs(cardId: string): Promise<SrsState | undefined> {
  const db = await getDb();
  return db.get('srs', cardId);
}

export async function saveSrs(s: SrsState): Promise<void> {
  const db = await getDb();
  await db.put('srs', s);
}

export async function listAllSrs(): Promise<SrsState[]> {
  const db = await getDb();
  return db.getAll('srs');
}

export async function dueSrs(byEpochMs: number): Promise<SrsState[]> {
  const db = await getDb();
  const range = IDBKeyRange.upperBound(byEpochMs);
  return db.getAllFromIndex('srs', 'by-due', range);
}

/* ─── export / import ───────────────────────────────── */

export async function exportAll(): Promise<ExportEnvelope> {
  const [settings, sessions, attempts, srs] = await Promise.all([
    getSettings(),
    listSessions(100000),
    listAttempts(),
    listAllSrs()
  ]);
  return {
    app: 'dp600-stark-v2',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { settings, sessions, attempts, srs }
  };
}

export class ImportError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Validates the envelope shape and writes it. Throws ImportError on malformed input. */
export async function importAll(raw: unknown, opts: { merge?: boolean } = {}): Promise<{ counts: { sessions: number; attempts: number; srs: number } }> {
  const env = validateEnvelope(raw);
  const db = await getDb();
  if (!opts.merge) {
    await Promise.all([
      db.clear('state'),
      db.clear('sessions'),
      db.clear('attempts'),
      db.clear('srs')
    ]);
  }
  const tx = db.transaction(['state', 'sessions', 'attempts', 'srs'], 'readwrite');
  await tx.objectStore('state').put({ k: 'state', settings: env.data.settings, schemaVersion: SCHEMA_VERSION });
  for (const s of env.data.sessions) await tx.objectStore('sessions').put(s);
  for (const a of env.data.attempts) await tx.objectStore('attempts').put(a);
  for (const r of env.data.srs) await tx.objectStore('srs').put(r);
  await tx.done;
  return { counts: { sessions: env.data.sessions.length, attempts: env.data.attempts.length, srs: env.data.srs.length } };
}

function validateEnvelope(raw: unknown): ExportEnvelope {
  if (!raw || typeof raw !== 'object') throw new ImportError('Import payload is not an object', 'NOT_OBJECT');
  const env = raw as Partial<ExportEnvelope>;
  if (env.app !== 'dp600-stark-v2') throw new ImportError(`Unknown app marker: ${String(env.app)}`, 'BAD_APP');
  if (typeof env.schemaVersion !== 'number') throw new ImportError('Missing schemaVersion', 'BAD_SCHEMA');
  if (env.schemaVersion > SCHEMA_VERSION) throw new ImportError(`Schema ${env.schemaVersion} newer than runtime ${SCHEMA_VERSION}`, 'SCHEMA_NEWER');
  if (!env.data || typeof env.data !== 'object') throw new ImportError('Missing data block', 'NO_DATA');
  const d = env.data as ExportEnvelope['data'];
  if (!d.settings || typeof d.settings !== 'object') throw new ImportError('Missing settings', 'NO_SETTINGS');
  if (!Array.isArray(d.sessions)) throw new ImportError('sessions must be array', 'NO_SESSIONS');
  if (!Array.isArray(d.attempts)) throw new ImportError('attempts must be array', 'NO_ATTEMPTS');
  if (!Array.isArray(d.srs)) throw new ImportError('srs must be array', 'NO_SRS');
  // shallow per-record validation
  for (const s of d.sessions) {
    if (!s || typeof s.id !== 'string' || typeof s.startedAt !== 'number' || !Array.isArray(s.questionIds)) {
      throw new ImportError(`Malformed session entry: ${JSON.stringify(s).slice(0, 80)}`, 'BAD_SESSION');
    }
  }
  for (const a of d.attempts) {
    if (!a || typeof a.id !== 'string' || typeof a.questionId !== 'string' || typeof a.ts !== 'number' || typeof a.correct !== 'boolean') {
      throw new ImportError(`Malformed attempt entry: ${JSON.stringify(a).slice(0, 80)}`, 'BAD_ATTEMPT');
    }
  }
  for (const r of d.srs) {
    if (!r || typeof r.cardId !== 'string' || typeof r.due !== 'number' || typeof r.ease !== 'number') {
      throw new ImportError(`Malformed srs entry: ${JSON.stringify(r).slice(0, 80)}`, 'BAD_SRS');
    }
  }
  return raw as ExportEnvelope;
}

export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await Promise.all([db.clear('state'), db.clear('sessions'), db.clear('attempts'), db.clear('srs')]);
}
