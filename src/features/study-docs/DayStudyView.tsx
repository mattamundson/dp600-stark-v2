import { Link, useParams } from 'react-router-dom';
import { studyPlan } from '../../data/studyPlan';
import { refSections } from '../reference/content';
import { DAY_DOCS } from '../../data/study-docs/dayDocs';
import { DECK_LABEL, DOMAIN_LABEL } from '../../lib/schema';
import type { RefSection } from '../reference/content';

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function RefSectionContent({ section }: { section: RefSection }) {
  return (
    <div className="mt-3 flex flex-col gap-3 text-sm">
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-muted leading-relaxed">{p}</p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-1.5 pl-4">
          {section.bullets.map((b, i) => (
            <li key={i} className="relative text-muted before:absolute before:-left-4 before:content-['•'] before:text-primary">
              {b}
            </li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {section.table.headers.map((h) => (
                  <th key={h} className="border border-border/60 bg-surface3 px-3 py-2 text-left font-semibold text-text">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, i) => (
                <tr key={i} className="even:bg-surface2">
                  {row.map((cell, j) => (
                    <td key={j} className="border border-border/60 px-3 py-2 text-muted">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.code && (
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-surface3 p-3 text-xs leading-relaxed text-text">
          <code>{section.code.body}</code>
        </pre>
      )}
      {section.warning && (
        <div className="rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-xs text-amber-400">
          <span className="font-semibold">⚠ Exam trap: </span>{section.warning}
        </div>
      )}
    </div>
  );
}

function parseTarget(target: string): { prefix: string; value: string } {
  const idx = target.indexOf(':');
  if (idx === -1) return { prefix: target, value: '' };
  return { prefix: target.slice(0, idx), value: target.slice(idx + 1) };
}

export function DayStudyView() {
  const { n } = useParams<{ n: string }>();
  const dayNum = Number(n);
  const day = studyPlan.find((d) => d.day === dayNum);
  const doc = DAY_DOCS.find((d) => d.day === dayNum);

  if (!day) {
    return (
      <div className="panel">
        <p className="text-muted">Day {n} not found. <Link to="/study-plan" className="text-primary underline">Back to study plan</Link></p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="panel">
        <div className="flex items-center justify-between gap-2">
          <Link to="/study-plan" className="btn btn-ghost text-xs">← Study Plan</Link>
          <div className="flex gap-2">
            {dayNum > 1 && (
              <Link to={`/study/day/${dayNum - 1}`} className="btn btn-ghost text-xs">← Day {dayNum - 1}</Link>
            )}
            {dayNum < 14 && (
              <Link to={`/study/day/${dayNum + 1}`} className="btn btn-ghost text-xs">Day {dayNum + 1} →</Link>
            )}
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-faint">Day {dayNum} of 14</p>
          <h1 className="mt-1 text-2xl font-bold">{day.title}</h1>
          <p className="mt-1 text-muted">{day.focus}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {day.domains.map((d) => (
              <span key={d} className="badge">{DOMAIN_LABEL[d]}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Blocks */}
      {day.blocks.map((block, i) => {
        const { prefix, value } = parseTarget(block.target);

        if (block.kind === 'reference') {
          const section = refSections.find((s) => s.slug === value);
          const docSection = doc?.sections.find((s) => s.sectionSlug === value);
          return (
            <article key={i} id={value} className="panel scroll-mt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="badge mb-2">Reference · {block.minutes}m</span>
                  <h2 className="text-lg font-bold">{section?.title ?? value}</h2>
                  {section?.category && (
                    <p className="text-xs text-faint">{section.category}</p>
                  )}
                </div>
                <Link
                  to={`/reference#${value}`}
                  className="btn btn-ghost shrink-0 text-xs"
                  title="Open in Reference Sheet"
                >
                  Full ref →
                </Link>
              </div>
              {block.notes && (
                <p className="mt-2 rounded-lg border border-cyan/20 bg-cyan/5 px-3 py-2 text-xs text-cyan-400">
                  <span className="font-semibold">Study note: </span>{block.notes}
                </p>
              )}
              {section ? (
                <RefSectionContent section={section} />
              ) : (
                <p className="mt-2 text-sm text-faint">Section "{value}" not found in reference content.</p>
              )}
              {docSection && docSection.links.length > 0 && (
                <div className="mt-5 border-t border-border/40 pt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
                    Microsoft Learn — go deeper
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {docSection.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost justify-start gap-2 text-left text-sm"
                      >
                        <ExternalLinkIcon />
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        }

        if (block.kind === 'flashcards') {
          const deckLabel = DECK_LABEL[value as keyof typeof DECK_LABEL] ?? value;
          return (
            <article key={i} className="panel-tight flex items-center justify-between gap-3">
              <div>
                <span className="badge mr-2">Flashcards · {block.minutes}m</span>
                <span className="font-medium">{deckLabel}</span>
                {block.notes && <p className="mt-1 text-xs text-muted">{block.notes}</p>}
              </div>
              <Link to={`/flashcards?deck=${value}`} className="btn btn-primary shrink-0">
                Open deck →
              </Link>
            </article>
          );
        }

        if (block.kind === 'quiz') {
          const domain = prefix === 'domain' ? value : day.domains[0];
          return (
            <article key={i} className="panel-tight flex items-center justify-between gap-3">
              <div>
                <span className="badge mr-2">Quiz · {block.minutes}m</span>
                <span className="font-medium">{DOMAIN_LABEL[domain as keyof typeof DOMAIN_LABEL] ?? domain}</span>
                {block.notes && <p className="mt-1 text-xs text-muted">{block.notes}</p>}
              </div>
              <Link to={`/quiz?domain=${domain}&len=25`} className="btn btn-primary shrink-0">
                Start quiz →
              </Link>
            </article>
          );
        }

        if (block.kind === 'scenario') {
          const scnId = value;
          return (
            <article key={i} className="panel-tight flex items-center justify-between gap-3">
              <div>
                <span className="badge mr-2">Scenario · {block.minutes}m</span>
                <span className="font-medium">{scnId}</span>
                {block.notes && <p className="mt-1 text-xs text-muted">{block.notes}</p>}
              </div>
              <Link to={`/scenarios/${scnId}`} className="btn btn-primary shrink-0">
                Open scenario →
              </Link>
            </article>
          );
        }

        if (block.kind === 'simulation') {
          return (
            <article key={i} className="panel-tight flex items-center justify-between gap-3">
              <div>
                <span className="badge mr-2">Simulation · {block.minutes}m</span>
                <span className="font-medium">Full 65-question exam simulation</span>
                {block.notes && <p className="mt-1 text-xs text-muted">{block.notes}</p>}
              </div>
              <Link to="/simulation-v2" className="btn btn-primary shrink-0">
                Start sim →
              </Link>
            </article>
          );
        }

        if (block.kind === 'remediation') {
          return (
            <article key={i} className="panel-tight flex items-center justify-between gap-3">
              <div>
                <span className="badge mr-2">Remediation · {block.minutes}m</span>
                <span className="font-medium">Weak-area drill</span>
                {block.notes && <p className="mt-1 text-xs text-muted">{block.notes}</p>}
              </div>
              <Link to="/remediation" className="btn btn-primary shrink-0">
                Remediate →
              </Link>
            </article>
          );
        }

        return (
          <article key={i} className="panel-tight">
            <span className="badge mr-2 capitalize">{block.kind} · {block.minutes}m</span>
            <span className="text-muted">{block.target}</span>
          </article>
        );
      })}

      {/* Footer */}
      <div className="flex flex-wrap gap-2 pb-4">
        <Link to="/study-plan" className="btn btn-ghost">← Study Plan</Link>
        <Link to={`/quiz?domain=${day.domains[0]}&len=25`} className="btn">Quiz this domain</Link>
        <Link to="/flashcards" className="btn btn-ghost">Flashcards</Link>
        <Link to="/remediation" className="btn btn-ghost">Remediate</Link>
      </div>
    </div>
  );
}
