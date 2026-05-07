import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAttempts, listSessions, getActiveSimulation } from '../../lib/storage/db';
import { readinessFromAttempts } from '../../lib/scoring/score';
import { questionBank } from '../../data/questions';
import { flashcards } from '../../data/flashcards';
import { scenarios } from '../../data/scenarios';
import { studyPlan } from '../../data/studyPlan';
import type { Attempt, Session } from '../../lib/schema';
import { useSettings } from '../../app/providers/SettingsProvider';
import { daysBetween } from '../../lib/utils/time';
import { DangerousWeakSpotsPanel } from '../../components/DangerousWeakSpotsPanel';
import { calibrate } from '../analytics/calibration';
import { rateReadiness, recommendNextBlock } from '../analytics/readiness';
import { dailyAttemptCounts, getStreakMinAttempts, studyStreak, todayStats, type DailyCount } from './streak';
import { sinceLastSim, type SimDelta } from './sim-delta';
import { UnseenOnlyEntryCard } from '../quiz/UnseenOnlyEntryCard';
import { SyllabusPreviewCard } from '../syllabus/SyllabusPreviewCard';

export function DashboardView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resumeSim, setResumeSim] = useState<Session | undefined>(undefined);
  const { settings } = useSettings();

  useEffect(() => {
    void Promise.all([listAttempts(), listSessions(20), getActiveSimulation()]).then(([a, s, sim]) => {
      setAttempts(a);
      setSessions(s);
      setResumeSim(sim);
    });
  }, []);

  const readiness = attempts.length ? readinessFromAttempts(attempts) : null;
  const calibration = useMemo(() => (attempts.length ? calibrate(attempts) : null), [attempts]);
  const today = useMemo(() => todayStats(attempts, Date.now()), [attempts]);
  const streak = useMemo(
    () => studyStreak(attempts, Date.now(), getStreakMinAttempts(settings)),
    [attempts, settings]
  );
  const heatmap = useMemo(() => dailyAttemptCounts(attempts, Date.now(), 14), [attempts]);
  const simDelta = useMemo(() => sinceLastSim(sessions, attempts), [sessions, attempts]);
  const readinessV2 = useMemo(() => (attempts.length ? rateReadiness(attempts, questionBank) : null), [attempts]);
  const nextBlock = useMemo(
    () => (readinessV2 ? recommendNextBlock(readinessV2, attempts, questionBank) : null),
    [readinessV2, attempts]
  );
  const lastSession = sessions.find((s) => s.finishedAt && s.resultSummary);
  const daysToExam = settings?.examDateIso ? Math.max(0, daysBetween(new Date().toISOString(), settings.examDateIso)) : null;
  const todayPlan = useMemo(() => {
    if (!settings || studyPlan.length === 0) return null;
    const offset = daysBetween(settings.startedAtIso, new Date().toISOString());
    const day = Math.min(14, Math.max(1, offset + 1));
    return studyPlan.find((d) => d.day === day) ?? null;
  }, [settings]);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="text-muted">
              {readiness === null ? 'No attempts yet — start anywhere.' : `Readiness ${readiness}/1000`}
              {daysToExam !== null && ` · Exam in ${daysToExam} days`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/quiz?len=10" className="btn btn-primary">10 min</Link>
            <Link to="/quiz?len=25" className="btn">25 min</Link>
            <Link to="/quiz?len=50" className="btn">50 min</Link>
            <Link to="/simulation" className="btn">Full sim</Link>
          </div>
        </div>
      </header>

      {resumeSim && (
        <section className="panel border-warn/40 bg-warn/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Resume in-progress simulation</h2>
              <p className="text-sm text-muted">Started {new Date(resumeSim.startedAt).toLocaleString()} · cursor at Q{(resumeSim.snapshot?.cursor ?? 0) + 1}</p>
            </div>
            <Link to="/simulation" className="btn btn-primary">Resume</Link>
          </div>
        </section>
      )}

      {settings && !settings.examDateIso && (
        <section className="panel border-primary/40 bg-primary/10 exam-day-hide">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Set your exam date</h2>
              <p className="text-sm text-muted">
                Unlocks the cockpit countdown, readiness pacing weighting, and "exam in N days" header. Takes 5 seconds.
              </p>
            </div>
            <Link to="/settings#exam-date" className="btn btn-primary">Set exam date →</Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="panel">
          <div className="text-xs uppercase text-faint">Today</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{today.attemptsToday}</span>
            <span className="text-sm text-muted">attempts</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            {today.attemptsToday > 0
              ? `${today.correctToday}/${today.attemptsToday} · ${Math.round(today.accuracyToday * 100)}% accuracy`
              : 'No attempts today yet.'}
          </div>
        </div>
        <div className="panel">
          <div className="text-xs uppercase text-faint">Daily streak</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{streak}</span>
            <span className="text-sm text-muted">{streak === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            {streak === 0
              ? 'Hit 10 attempts today to start a streak.'
              : `≥10 attempts/day. Today ${today.attemptsToday >= 10 ? 'qualifies' : `needs ${10 - today.attemptsToday} more`}.`}
          </div>
        </div>
        <BankCard label="Questions" value={questionBank.length} target={220} to="/quiz?len=10" />
        <UnseenOnlyEntryCard />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 exam-day-hide">
        <BankCard label="Flashcards" value={flashcards.length} target={120} to="/flashcards" />
        <BankCard label="Scenario sets" value={scenarios.length} target={15} to="/scenarios" />
        <SyllabusPreviewCard />
      </section>

      <HeatmapPanel cells={heatmap} />

      {simDelta && <SinceLastSimPanel delta={simDelta} />}

      <div className="exam-day-hide">
        <DangerousWeakSpotsPanel attempts={attempts} />
      </div>

      {readinessV2 && (
        <section className="grid gap-4 md:grid-cols-2 exam-day-hide">
          <div className="panel">
            <h2 className="mb-3 text-lg font-bold">Readiness rating</h2>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold">{readinessV2.score}</span>
              <span className="text-sm text-muted">/1000</span>
              <span
                className={`badge ${
                  readinessV2.band === 'green'
                    ? 'border-ok/40 bg-ok/15 text-ok'
                    : readinessV2.band === 'yellow'
                    ? 'border-warn/40 bg-warn/15 text-warn'
                    : 'border-danger/40 bg-danger/15 text-danger'
                }`}
              >
                {readinessV2.band}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-muted">Coverage</span><span>{readinessV2.subscores.coverage}</span></li>
              <li className="flex justify-between"><span className="text-muted">Accuracy</span><span>{readinessV2.subscores.accuracy}</span></li>
              <li className="flex justify-between"><span className="text-muted">Calibration</span><span>{readinessV2.subscores.calibration}</span></li>
              <li className="flex justify-between"><span className="text-muted">Pacing</span><span>{readinessV2.subscores.pacing}</span></li>
            </ul>
            {nextBlock && (
              <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <div className="text-xs uppercase tracking-wider text-faint">Next block</div>
                <div className="font-bold capitalize">{nextBlock.focus}</div>
                <div className="text-muted">{nextBlock.rationale}</div>
              </div>
            )}
          </div>
          <div className="panel">
            <h2 className="mb-3 text-lg font-bold">Confidence calibration</h2>
            {calibration && calibration.n > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-faint">
                      <th className="border-b border-border px-1 py-2 text-left">Confidence</th>
                      <th className="border-b border-border px-1 py-2 text-right">n</th>
                      <th className="border-b border-border px-1 py-2 text-right">Acc%</th>
                      <th className="border-b border-border px-1 py-2 text-right">Expected</th>
                      <th className="border-b border-border px-1 py-2 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibration.bins.map((b) => (
                      <tr key={b.confidence} className="border-b border-border/40">
                        <td className="px-1 py-2 capitalize">{b.confidence}</td>
                        <td className="px-1 py-2 text-right">{b.n}</td>
                        <td className="px-1 py-2 text-right">{Number.isNaN(b.accuracy) ? '–' : `${Math.round(b.accuracy * 100)}%`}</td>
                        <td className="px-1 py-2 text-right text-muted">{Math.round(b.expected * 100)}%</td>
                        <td className={`px-1 py-2 text-right ${b.gap < -0.1 ? 'text-warn' : 'text-muted'}`}>
                          {Number.isNaN(b.gap) ? '–' : `${b.gap > 0 ? '+' : ''}${Math.round(b.gap * 100)}pp`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calibration.overconfidenceScore > 0.05 && (
                  <div className="mt-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                    <strong>Overconfidence detected</strong> — weighted gap {calibration.overconfidenceScore.toFixed(2)}. Watch the "sure" row.
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">No data yet — calibration appears after a few attempts.</p>
            )}
          </div>
        </section>
      )}

      <section className="panel exam-day-hide">
        <h2 className="mb-3 text-lg font-bold">Last session</h2>
        {lastSession?.resultSummary ? (
          <div className="text-sm">
            <div className="text-muted">{new Date(lastSession.startedAt).toLocaleString()}</div>
            <div className="mt-1 font-display text-2xl font-bold">{lastSession.resultSummary.scaledScore}/1000</div>
            <div className="text-muted">{lastSession.resultSummary.correct}/{lastSession.resultSummary.total} · {Math.round(lastSession.resultSummary.accuracy * 100)}%</div>
            <div className="mt-3"><Link className="btn btn-ghost" to={`/history/${lastSession.id}`}>Review →</Link></div>
          </div>
        ) : (
          <p className="text-sm text-muted">No completed session yet.</p>
        )}
      </section>

      <section className="panel exam-day-hide">
        <h2 className="mb-3 text-lg font-bold">Today on the plan</h2>
        {todayPlan ? (
          <div className="text-sm">
            <div className="mb-1 text-xs uppercase text-faint">Day {todayPlan.day} · {todayPlan.title}</div>
            <p className="mb-3 text-muted">{todayPlan.focus}</p>
            <ul className="space-y-1">
              {todayPlan.blocks.map((b, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2">
                  <span><span className="badge mr-2 capitalize text-[10px]">{b.kind}</span>{b.target}</span>
                  <span className="text-xs text-muted">{b.minutes}m</span>
                </li>
              ))}
            </ul>
            <div className="mt-3"><Link to="/study-plan" className="btn btn-ghost text-xs">Full plan →</Link></div>
          </div>
        ) : (
          <p className="text-sm text-muted">Plan not loaded yet.</p>
        )}
      </section>
    </div>
  );
}

function HeatmapPanel({ cells }: { cells: DailyCount[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  function intensity(c: number): string {
    if (c === 0) return 'bg-surface2 text-faint';
    const ratio = c / max;
    if (ratio < 0.25) return 'bg-primary/20 text-text';
    if (ratio < 0.5) return 'bg-primary/40 text-text';
    if (ratio < 0.75) return 'bg-primary/60 text-white';
    return 'bg-primary text-white';
  }
  const total = cells.reduce((s, c) => s + c.count, 0);
  const activeDays = cells.filter((c) => c.count > 0).length;
  return (
    <section className="panel exam-day-hide">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">14-day activity</h2>
        <span className="text-xs text-muted">
          {total} attempt{total === 1 ? '' : 's'} · {activeDays} of 14 days active
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
        {cells.map((c) => (
          <div
            key={c.date}
            className={`flex h-9 items-center justify-center rounded-md text-[11px] font-mono ${intensity(c.count)}`}
            title={`${c.date} — ${c.count} attempt${c.count === 1 ? '' : 's'}`}
          >
            {c.dayOfMonth}
          </div>
        ))}
      </div>
    </section>
  );
}

function SinceLastSimPanel({ delta }: { delta: SimDelta }) {
  const scoreSign = delta.scoreDelta > 0 ? '+' : '';
  const scoreTone = delta.scoreDelta > 0 ? 'text-ok' : delta.scoreDelta < 0 ? 'text-bad' : 'text-muted';
  const accSign = delta.accuracyDelta > 0 ? '+' : '';
  const accTone = delta.accuracyDelta > 0 ? 'text-ok' : delta.accuracyDelta < 0 ? 'text-bad' : 'text-muted';
  return (
    <section className="panel exam-day-hide">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Since last simulation</h2>
        <span className="text-xs text-muted">
          {delta.attemptsBetween} attempt{delta.attemptsBetween === 1 ? '' : 's'} between sims
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase text-faint">Score</div>
          <div className="font-display text-2xl font-bold">{delta.curr.scaledScore}</div>
          <div className={`text-xs ${scoreTone}`}>
            {scoreSign}{delta.scoreDelta} vs {delta.prev.scaledScore}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Accuracy</div>
          <div className="font-display text-2xl font-bold">{Math.round(delta.curr.accuracy * 100)}%</div>
          <div className={`text-xs ${accTone}`}>
            {accSign}{Math.round(delta.accuracyDelta * 100)}pp vs {Math.round(delta.prev.accuracy * 100)}%
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Last sim</div>
          <div className="text-sm">{new Date(delta.curr.finishedAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted">prev: {new Date(delta.prev.finishedAt).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="mt-3">
        <Link className="btn btn-ghost text-xs" to={`/history/${delta.curr.sessionId}`}>
          Review latest →
        </Link>
      </div>
    </section>
  );
}

function BankCard({ label, value, target, to }: { label: string; value: number; target: number; to: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <Link to={to} className="panel transition hover:border-primary/40">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase text-faint">{label}</div>
          <div className="font-display text-3xl font-bold">{value}</div>
          <div className="text-xs text-muted">target {target}</div>
        </div>
      </div>
      <div className="mt-3 progress"><span style={{ width: `${pct}%` }} /></div>
    </Link>
  );
}
