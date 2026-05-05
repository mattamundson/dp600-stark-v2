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

      <section className="grid gap-4 md:grid-cols-3">
        <BankCard label="Questions" value={questionBank.length} target={220} to="/quiz?len=10" />
        <BankCard label="Flashcards" value={flashcards.length} target={120} to="/flashcards" />
        <BankCard label="Scenario sets" value={scenarios.length} target={15} to="/scenarios" />
      </section>

      <DangerousWeakSpotsPanel attempts={attempts} />

      {readinessV2 && (
        <section className="grid gap-4 md:grid-cols-2">
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
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
        </div>

        <div className="panel">
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
        </div>
      </section>
    </div>
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
