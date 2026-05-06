import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { studyPlan } from '../../data/studyPlan';
import { useSettings } from '../../app/providers/SettingsProvider';
import { daysBetween } from '../../lib/utils/time';
import { DOMAIN_LABEL } from '../../lib/schema';

export function StudyPlanView() {
  const { settings, patch } = useSettings();
  const today = useMemo(() => {
    if (!settings) return null;
    const start = new Date(settings.startedAtIso).toISOString();
    const offset = daysBetween(start, new Date().toISOString());
    return Math.min(14, Math.max(1, offset + 1));
  }, [settings]);

  const emphasisLive = !!settings?.emphasisMode &&
    settings.emphasisMode.expiresAt > Date.now() &&
    settings.emphasisMode.sessionsRemaining > 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="text-2xl font-bold">14-day study plan</h1>
        <p className="text-muted">Weighted toward Prepare data early; mixed remediation + simulation late.</p>
      </header>

      <section className="panel flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Emphasis mode</h2>
          {emphasisLive && settings?.emphasisMode ? (
            <span className="badge badge-info">
              {settings.emphasisMode.domain} · {settings.emphasisMode.sessionsRemaining} sessions left
            </span>
          ) : (
            <span className="text-xs text-faint">none active</span>
          )}
        </div>
        <p className="text-sm text-muted">
          Skew the next 5 quiz sessions toward one domain (+15% weight; other domains shrink proportionally).
        </p>
        <div className="flex flex-wrap gap-2">
          {(['prepare', 'maintain', 'semantic'] as const).map((d) => (
            <button
              key={d}
              className="btn"
              onClick={() =>
                void patch({
                  emphasisMode: {
                    domain: d,
                    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
                    sessionsRemaining: 5
                  }
                })
              }
            >
              Emphasize {d === 'prepare' ? 'Prepare' : d === 'maintain' ? 'Maintain' : 'Semantic'} for next 5 sessions
            </button>
          ))}
          <button
            className="btn btn-ghost"
            onClick={() => void patch({ emphasisMode: undefined })}
            disabled={!settings?.emphasisMode}
          >
            Clear
          </button>
        </div>
      </section>

      {studyPlan.length === 0 ? (
        <section className="panel"><p className="text-muted">Plan content seeds in Phase 4.</p></section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {studyPlan.map((d) => {
            const isToday = d.day === today;
            const isPast = today !== null && d.day < today;
            return (
              <article key={d.day} className={`panel ${isToday ? 'border-primary/40 bg-primary/10' : isPast ? 'opacity-60' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase text-faint">Day</div>
                    <div className="font-display text-3xl font-bold">{d.day}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.domains.map((dom) => (<span key={dom} className="badge">{DOMAIN_LABEL[dom]}</span>))}
                  </div>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{d.title}</h3>
                <p className="text-sm text-muted">{d.focus}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {d.blocks.map((b, i) => {
                    const idx = b.target.indexOf(':');
                    const prefix = idx === -1 ? b.target : b.target.slice(0, idx);
                    const value = idx === -1 ? '' : b.target.slice(idx + 1);
                    let to = `/study/day/${d.day}`;
                    if (b.kind === 'reference') to = `/study/day/${d.day}#${value}`;
                    else if (b.kind === 'flashcards') to = `/flashcards?deck=${value}`;
                    else if (b.kind === 'quiz') to = `/quiz?domain=${prefix === 'domain' ? value : d.domains[0]}&len=25`;
                    else if (b.kind === 'scenario') to = `/scenarios/${value}`;
                    else if (b.kind === 'simulation') to = '/simulation-v2';
                    else if (b.kind === 'remediation') to = '/remediation';
                    return (
                      <li key={i} className="flex items-center justify-between">
                        <Link to={to} className="flex flex-1 items-center gap-1 text-muted hover:text-text transition-colors">
                          <span className="badge capitalize">{b.kind}</span>
                          <span className="truncate">{value || b.target}</span>
                        </Link>
                        <span className="ml-2 shrink-0 text-faint">{b.minutes}m</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/study/day/${d.day}`} className="btn btn-primary">Study</Link>
                  <Link to="/quiz?len=25" className="btn btn-ghost">Quiz</Link>
                  <Link to="/flashcards" className="btn btn-ghost">Cards</Link>
                  <Link to="/remediation" className="btn btn-ghost">Remediate</Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
