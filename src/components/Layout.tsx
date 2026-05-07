import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../app/providers/SettingsProvider';
import { listAttempts } from '../lib/storage/db';
import { questionBank } from '../data/questions';

const ROUTES = [
  { to: '/', label: 'Dashboard', short: 'Home' },
  { to: '/quiz', label: 'Adaptive Quiz', short: 'Quiz' },
  { to: '/simulation', label: 'Full Simulation', short: 'Sim' },
  { to: '/simulation-v2', label: 'Sim · 65Q Realism', short: 'Sim2' },
  { to: '/cockpit', label: 'Last 72 Hours Cockpit', short: 'Cock' },
  { to: '/cheat-sheet', label: 'Exam Cheat Sheet', short: 'Sheet' },
  { to: '/syllabus', label: 'Syllabus Coverage', short: 'Syl' },
  { to: '/missed', label: 'Missed Patterns', short: 'Miss' },
  { to: '/scenarios', label: 'Scenario Chains', short: 'Scn' },
  { to: '/flashcards', label: 'Flashcards', short: 'Cards' },
  { to: '/remediation', label: 'Weak-Area Remediation', short: 'Fix' },
  { to: '/mastery/direct-lake', label: 'Direct Lake Mastery', short: 'DL' },
  { to: '/lab/component-picker', label: 'Lab · Component Picker', short: 'Pick' },
  { to: '/lab/kql-drill', label: 'Lab · KQL Mini-Drill', short: 'KQL' },
  { to: '/lab/calc-groups', label: 'Lab · Calc Groups Code', short: 'CG' },
  { to: '/lab/star-schema', label: 'Lab · Star Schema', short: 'Star' },
  { to: '/analytics', label: 'Progress Analytics', short: 'Stats' },
  { to: '/study-plan', label: 'Study Plan', short: 'Plan' },
  { to: '/reference', label: 'Reference Sheet', short: 'Ref' },
  { to: '/history', label: 'History', short: 'Log' },
  { to: '/settings', label: 'Settings', short: 'Set' }
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:border focus:border-primary focus:bg-bg focus:px-3 focus:py-2 focus:text-sm focus:text-text"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main
        id="main-content"
        role="main"
        className="flex min-w-0 flex-col gap-4 p-4 pb-24 lg:p-6 lg:pb-6"
      >
        {children}
      </main>
      <MobileBar />
    </div>
  );
}

function Sidebar() {
  const { settings, patch } = useSettings();
  const [bankSize, setBankSize] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setBankSize(questionBank.length);
    void listAttempts().then((a) => setAttempts(a.length));
  }, []);

  return (
    <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-border/60 bg-black/10 p-5 lg:block">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/30 to-cyan/15 font-display font-bold text-primary">
            F·
          </div>
          <div>
            <div className="font-display text-sm font-bold leading-tight">DP-600 Stark V2</div>
            <div className="text-xs text-faint">Fabric Analytics Engineer</div>
          </div>
        </div>
        <button
          aria-label="Toggle theme"
          className="btn-ghost btn"
          onClick={() => void patch({ theme: settings?.theme === 'light' ? 'dark' : 'light' })}
        >
          {settings?.theme === 'light' ? '☀' : '☾'}
        </button>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {ROUTES.map((r) => (
          <NavLink
            key={r.to}
            to={r.to}
            end={r.to === '/'}
            className={({ isActive }) =>
              `rounded-xl border px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-primary/40 bg-primary/15 text-text'
                  : 'border-transparent text-muted hover:bg-surface2 hover:text-text'
              }`
            }
          >
            {r.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-3">
        <div className="panel-tight">
          <div className="text-xs uppercase tracking-wider text-faint">Question bank</div>
          <div className="font-display text-2xl font-bold">{bankSize}</div>
          <div className="text-xs text-faint">single · multi · ordering · scenario</div>
        </div>
        <div className="panel-tight">
          <div className="text-xs uppercase tracking-wider text-faint">Attempts logged</div>
          <div className="font-display text-2xl font-bold">{attempts}</div>
          <div className="text-xs text-faint">across all sessions</div>
        </div>
      </div>
    </aside>
  );
}

function MobileBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border/60 bg-surface/95 backdrop-blur lg:hidden"
      >
        {ROUTES.slice(0, 4).map((r) => (
          <NavLink
            key={r.to}
            to={r.to}
            end={r.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-center px-2 py-3 text-xs ${isActive ? 'text-primary' : 'text-muted'}`
            }
          >
            {r.short}
          </NavLink>
        ))}
        <button
          type="button"
          aria-label="More navigation"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center px-2 py-3 text-xs text-muted"
        >
          More
        </button>
      </nav>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-border bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">All sections</h2>
              <button className="btn btn-ghost text-xs" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROUTES.map((r) => (
                <NavLink
                  key={r.to}
                  to={r.to}
                  end={r.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl border px-3 py-3 text-sm ${isActive ? 'border-primary/40 bg-primary/15 text-text' : 'border-border bg-surface2 text-muted'}`
                  }
                >
                  {r.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
