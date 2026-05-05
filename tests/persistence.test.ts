import { describe, expect, test } from 'vitest';
import {
  exportAll,
  getSettings,
  importAll,
  ImportError,
  saveAttempt,
  saveSession,
  saveSrs,
  updateSettings,
  wipeAll
} from '../src/lib/storage/db';
import type { Attempt, Session, SrsState } from '../src/lib/schema';

const session: Session = {
  id: 'sess-1',
  mode: 'quiz-10',
  startedAt: 1_700_000_000_000,
  finishedAt: 1_700_000_300_000,
  questionIds: ['q1', 'q2']
};

const attempt: Attempt = {
  id: 'a1',
  questionId: 'q1',
  sessionId: 'sess-1',
  ts: 1_700_000_001_000,
  selectedOptionIds: ['A'],
  correct: true,
  latencyMs: 4200,
  confidence: 'sure',
  domain: 'semantic',
  subtopic: 'storage-modes',
  difficulty: 3
};

const srs: SrsState = {
  cardId: 'c1',
  ease: 2.5,
  interval: 1,
  reps: 1,
  due: 1_700_086_400_000,
  lastSeen: 1_700_000_000_000,
  lapses: 0
};

describe('persistence', () => {
  test('settings round trip', async () => {
    const s0 = await getSettings();
    expect(s0.theme).toBe('dark');
    const s1 = await updateSettings({ theme: 'light' });
    expect(s1.theme).toBe('light');
    const s2 = await getSettings();
    expect(s2.theme).toBe('light');
  });

  test('export then import round trip preserves records', async () => {
    await wipeAll();
    await saveSession(session);
    await saveAttempt(attempt);
    await saveSrs(srs);
    const env = await exportAll();
    expect(env.app).toBe('dp600-stark-v2');
    expect(env.data.sessions).toHaveLength(1);
    expect(env.data.attempts).toHaveLength(1);
    expect(env.data.srs).toHaveLength(1);

    await wipeAll();
    const after = await exportAll();
    expect(after.data.sessions).toHaveLength(0);

    const result = await importAll(env);
    expect(result.counts).toEqual({ sessions: 1, attempts: 1, srs: 1 });
  });

  test('malformed import fails with typed error, no partial write', async () => {
    await wipeAll();
    await expect(importAll(null)).rejects.toBeInstanceOf(ImportError);
    await expect(importAll({ app: 'wrong' })).rejects.toMatchObject({ code: 'BAD_APP' });
    await expect(importAll({ app: 'dp600-stark-v2', schemaVersion: 999, data: {} })).rejects.toMatchObject({ code: 'SCHEMA_NEWER' });
    await expect(
      importAll({ app: 'dp600-stark-v2', schemaVersion: 1, data: { settings: {}, sessions: 'nope', attempts: [], srs: [] } })
    ).rejects.toMatchObject({ code: 'NO_SESSIONS' });
    const stillEmpty = await exportAll();
    expect(stillEmpty.data.sessions).toHaveLength(0);
  });
});
