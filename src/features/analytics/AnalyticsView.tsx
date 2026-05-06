import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAttempts, listSessions } from '../../lib/storage/db';
import { accuracyByDomain, accuracyBySubtopic, calibration, recentWindow, timePerTopic, trend, finishedSessions, pacingSummary, pacingTrend, PROJECTION_QUESTIONS, TARGET_PER_Q_MS_HIGH, type PacingSummary, type PacingTrendPoint } from './engine';
import { weakSpots } from '../remediation/engine';
import { readinessFromAttempts } from '../../lib/scoring/score';
import type { Attempt, Session } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';
import { formatHumanDuration } from '../../lib/utils/time';

export function AnalyticsView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    void Promise.all([listAttempts(), listSessions(200)]).then(([a, s]) => {
      setAttempts(a);
      setSessions(s);
    });
  }, []);

  if (!attempts.length) {
    return (
      <section className="panel">
        <h1 className="text-xl font-bold">Progress analytics</h1>
        <p className="text-muted">Answer at least one question to see analytics.</p>
        <Link to="/quiz?len=10" className="btn btn-primary mt-3">Start a 10-min quiz</Link>
      </section>
    );
  }

  const readiness = readinessFromAttempts(attempts);
  const last7 = recentWindow(attempts, 7);
  const last30 = recentWindow(attempts, 30);
  const dom = accuracyByDomain(attempts);
  const sub = accuracyBySubtopic(attempts);
  const cal = calibration(attempts);
  const tt = timePerTopic(attempts).slice(0, 8);
  const trend7 = trend(last7);
  const sims = finishedSessions(sessions).filter((s) => s.mode === 'simulation');
  const spots = weakSpots(attempts);
  const pacing = pacingSummary(last7, sessions);
  const pacingHistory = pacingTrend(attempts, sessions, 12);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel grid gap-4 md:grid-cols-4">
        <Stat label="Readiness (0–1000)" value={readiness} />
        <Stat label="Total attempts" value={attempts.length} />
        <Stat label="Last 7 days" value={`${last7.filter((a) => a.correct).length}/${last7.length}`} sub={`${pct(last7.filter((a) => a.correct).length, last7.length)}% acc`} />
        <Stat label="Last 30 days" value={`${last30.filter((a) => a.correct).length}/${last30.length}`} sub={`${pct(last30.filter((a) => a.correct).length, last30.length)}% acc`} />
      </header>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Accuracy by domain</h2>
        <div className="space-y-3">
          {dom.map((d) => (
            <div key={d.domain}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{DOMAIN_LABEL[d.domain]}</span>
                <span className="text-muted">{d.correct}/{d.total} · {Math.round(d.accuracy * 100)}%</span>
              </div>
              <div className="progress"><span style={{ width: `${Math.round(d.accuracy * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Confidence calibration</h2>
          <div className="space-y-3">
            {cal.map((c) => (
              <div key={c.confidence}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize">{c.confidence}</span>
                  <span className="text-muted">{c.correct}/{c.total} · {Math.round((c.accuracy || 0) * 100)}%</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${Math.round((c.accuracy || 0) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">If "Sure" accuracy is below 90%, you're over-confident. If "Guess" accuracy is above 50%, you're under-confident.</p>
        </div>

        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Daily accuracy (last 7d)</h2>
          {trend7.length === 0 ? (
            <p className="text-sm text-muted">Not enough recent data.</p>
          ) : (
            <Spark points={trend7.map((t) => t.accuracy * 100)} />
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Subtopic accuracy (worst first)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-faint"><th className="py-2">Subtopic</th><th>Domain</th><th>n</th><th>acc</th></tr></thead>
          <tbody>
            {sub.slice(0, 12).map((s) => (
              <tr key={s.subtopic} className="border-t border-border/60">
                <td className="py-2">{s.subtopic}</td>
                <td className="text-muted">{DOMAIN_LABEL[s.domain]}</td>
                <td className="text-muted">{s.total}</td>
                <td className={s.accuracy < 0.6 ? 'text-bad' : s.accuracy < 0.8 ? 'text-warn' : 'text-ok'}>{Math.round(s.accuracy * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <PacingPanel pacing={pacing} />

      <PacingTrendPanel history={pacingHistory} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Time per topic</h2>
          {tt.length === 0 ? <p className="text-sm text-muted">Latency tracked on adaptive quiz only.</p> : (
            <ul className="space-y-2 text-sm">
              {tt.map((t) => (
                <li key={t.subtopic} className="flex items-center justify-between"><span>{t.subtopic}</span><span className="text-muted">{formatHumanDuration(t.avgMs)} · n={t.total}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Recommended next block</h2>
          <Recommendation spots={spots} attempts={attempts} />
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Simulation history</h2>
        {sims.length === 0 ? <p className="text-sm text-muted">No completed simulations yet.</p> : (
          <ul className="space-y-2 text-sm">
            {sims.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-surface2 p-3">
                <span>{new Date(s.startedAt).toLocaleString()}</span>
                <span>{s.resultSummary?.correct}/{s.resultSummary?.total} · {s.resultSummary?.scaledScore} score</span>
                <Link className="btn btn-ghost" to={`/history/${s.id}`}>Review</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PacingPanel({ pacing }: { pacing: PacingSummary }) {
  const a = pacing.adaptive;
  const sim = pacing.simulationOrAll;
  if (a.status === 'insufficient' && sim.status === 'insufficient') {
    return null;
  }
  const focus = sim.status !== 'insufficient' ? sim : a;
  const tone = focus.status === 'red' ? 'text-bad' : focus.status === 'yellow' ? 'text-warn' : 'text-ok';
  const banner =
    focus.status === 'red'
      ? `At ${formatHumanDuration(focus.avgMs)} per question, a ${PROJECTION_QUESTIONS}-Q exam projects to ${Math.round(focus.projectionMinutes)} min — over the 100-min limit.`
      : focus.status === 'yellow'
        ? `Pacing is borderline (${formatHumanDuration(focus.avgMs)}/Q). At ${PROJECTION_QUESTIONS} questions you'd finish in ${Math.round(focus.projectionMinutes)} min — within budget but tight.`
        : `Pacing is on track (${formatHumanDuration(focus.avgMs)}/Q). Projected total ${Math.round(focus.projectionMinutes)} min on a ${PROJECTION_QUESTIONS}-Q exam.`;
  return (
    <section className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Pacing — last 7 days</h2>
        <span className={`badge ${focus.status === 'red' ? 'badge-bad' : focus.status === 'yellow' ? 'badge-warn' : 'badge-good'}`}>
          {focus.status.toUpperCase()}
        </span>
      </div>
      <p className={`mt-2 text-sm ${tone}`}>{banner}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Stat
          label="Adaptive avg/Q"
          value={a.attempts === 0 ? '—' : formatHumanDuration(a.avgMs)}
          sub={a.attempts === 0 ? 'no timed quizzes' : `n=${a.attempts}`}
        />
        <Stat
          label="Simulation avg/Q"
          value={sim.attempts === 0 ? '—' : formatHumanDuration(sim.avgMs)}
          sub={sim.attempts === 0 ? 'no recent sims' : pacing.simulationOrAll.source === 'simulation' ? `n=${sim.attempts}` : 'falling back to all'}
        />
        <Stat
          label={`Projected at ${PROJECTION_QUESTIONS} Q`}
          value={`${Math.round(focus.projectionMinutes)} min`}
          sub={focus.projectionMinutes <= 100 ? 'fits 100-min budget' : `${Math.round(focus.projectionMinutes - 100)} min over`}
        />
      </div>
      <div className="mt-3">
        <div className="text-xs uppercase text-faint">By domain</div>
        <div className="mt-1 grid gap-1 text-sm md:grid-cols-3">
          {pacing.byDomain.map((d) => (
            <div key={d.domain} className="flex items-baseline justify-between rounded-lg border border-border bg-surface2 px-3 py-2">
              <span className="capitalize text-muted">{d.domain}</span>
              <span>{d.attempts === 0 ? '—' : formatHumanDuration(d.avgMs)}</span>
            </div>
          ))}
        </div>
      </div>
      {focus.status === 'red' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/simulation" className="btn btn-primary">Run a full simulation</Link>
          <Link to="/quiz?len=25" className="btn">25-question adaptive quiz</Link>
        </div>
      )}
    </section>
  );
}

function PacingTrendPanel({ history }: { history: PacingTrendPoint[] }) {
  if (history.length < 2) {
    return (
      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">Pacing trend</h2>
        <p className="text-sm text-muted">Need at least 2 finished sessions with timed attempts to plot a trend.</p>
      </section>
    );
  }
  const seconds = history.map((p) => p.medianMs / 1000);
  const targetSec = TARGET_PER_Q_MS_HIGH / 1000;
  const latest = history[history.length - 1];
  const earliest = history[0];
  const deltaSec = (latest.medianMs - earliest.medianMs) / 1000;
  const deltaTone = deltaSec < -5 ? 'text-ok' : deltaSec > 5 ? 'text-warn' : 'text-muted';
  const deltaSign = deltaSec > 0 ? '+' : '';

  return (
    <section className="panel">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Pacing trend</h2>
        <span className="text-xs text-faint">last {history.length} sessions · target ≤ {Math.round(targetSec)}s/Q</span>
      </div>
      <SecondsSpark points={seconds} targetSec={targetSec} />
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-faint">Latest median</div>
          <div className="font-display text-2xl font-bold">{seconds[seconds.length - 1].toFixed(1)}s</div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Δ vs earliest</div>
          <div className={`font-display text-2xl font-bold ${deltaTone}`}>{deltaSign}{deltaSec.toFixed(1)}s</div>
        </div>
        <p className="text-xs text-muted">
          Negative delta = getting faster. Positive delta with red bars = pacing regression — drill timed quizzes before the exam.
        </p>
      </div>
    </section>
  );
}

function SecondsSpark({ points, targetSec }: { points: number[]; targetSec: number }) {
  const w = 480;
  const h = 100;
  const max = Math.max(targetSec * 1.5, ...points) || 1;
  const barW = (w / points.length) * 0.7;
  const gap = (w / points.length) * 0.3;
  const targetY = h - (targetSec / max) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" role="img" aria-label="Pacing trend by session">
      {points.map((p, i) => {
        const x = i * (barW + gap);
        const barH = (p / max) * h;
        const y = h - barH;
        const tone = p > targetSec * 1.2 ? 'rgb(var(--bad))' : p > targetSec ? 'rgb(var(--warn))' : 'rgb(var(--ok))';
        return <rect key={i} x={x} y={y} width={barW} height={barH} fill={tone} />;
      })}
      <line x1="0" x2={w} y1={targetY} y2={targetY} stroke="rgb(var(--primary))" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="0" x2={w} y1={h} y2={h} stroke="rgb(var(--border))" />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-faint">{label}</div>
      <div className="font-display text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((100 * n) / d);
}

function Spark({ points }: { points: number[] }) {
  if (!points.length) return null;
  const w = 320;
  const h = 80;
  const max = 100;
  const step = w / Math.max(1, points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <path d={path} fill="none" stroke="rgb(var(--primary))" strokeWidth="2" />
      <line x1="0" x2={w} y1={h} y2={h} stroke="rgb(var(--border))" />
    </svg>
  );
}

function Recommendation({ spots, attempts }: { spots: ReturnType<typeof weakSpots>; attempts: Attempt[] }) {
  if (spots.length === 0) {
    return <p className="text-sm text-muted">Insufficient data — start a 25-min quiz to baseline.</p>;
  }
  const wrongCounts: Record<string, number> = {};
  const sureWrongCounts: Record<string, number> = {};
  const totalCounts: Record<string, number> = {};
  for (const a of attempts) {
    totalCounts[a.subtopic] = (totalCounts[a.subtopic] ?? 0) + 1;
    if (!a.correct) {
      wrongCounts[a.subtopic] = (wrongCounts[a.subtopic] ?? 0) + 1;
      if (a.confidence === 'sure') sureWrongCounts[a.subtopic] = (sureWrongCounts[a.subtopic] ?? 0) + 1;
    }
  }
  const confident = spots
    .filter((s) => s.dangerScore >= 0.5 && (wrongCounts[s.subtopic] ?? 0) >= 2)
    .sort((a, b) => b.dangerScore - a.dangerScore);
  const lowAcc = spots.filter((s) => s.attempts >= 3).sort((a, b) => a.accuracy - b.accuracy);

  let pick: ReturnType<typeof weakSpots>[number] = spots[0];
  let reason = `weight ${pick.weight.toFixed(2)} · ${pick.attempts} attempts`;
  let size: 10 | 15 | 20 = 10;
  if (confident.length) {
    pick = confident[0];
    const total = totalCounts[pick.subtopic] ?? pick.attempts;
    const wrong = wrongCounts[pick.subtopic] ?? 0;
    const sure = sureWrongCounts[pick.subtopic] ?? 0;
    reason = `${wrong}/${total} wrong, ${sure} of those confident`;
    size = 15;
  } else if (lowAcc.length) {
    pick = lowAcc[0];
    const total = totalCounts[pick.subtopic] ?? pick.attempts;
    const correct = total - (wrongCounts[pick.subtopic] ?? 0);
    reason = `${correct}/${total} correct (${Math.round(pick.accuracy * 100)}%)`;
  }
  return (
    <div className="text-sm">
      <p className="mb-2">
        Drill <strong>{size}</strong> questions on <code className="rounded bg-surface2 px-1 py-0.5">{pick.subtopic}</code> — {reason}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/remediation?subtopic=${encodeURIComponent(pick.subtopic)}&size=${size}`} className="btn btn-primary">Start drill</Link>
        <Link to="/quiz?len=25" className="btn">Adaptive 25</Link>
      </div>
    </div>
  );
}
