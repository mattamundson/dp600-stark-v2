import { useMemo, useState } from 'react';
import { refSections } from './content';
import { PipelineDiagram } from './PipelineDiagram';

export function ReferenceView() {
  const [q, setQ] = useState('');
  const categories = useMemo(() => Array.from(new Set(refSections.map((s) => s.category))), []);
  const filtered = useMemo(() => {
    if (!q.trim()) return refSections;
    const needle = q.trim().toLowerCase();
    return refSections.filter((s) =>
      s.title.toLowerCase().includes(needle) ||
      s.category.toLowerCase().includes(needle) ||
      (s.paragraphs ?? []).some((p) => p.toLowerCase().includes(needle)) ||
      (s.bullets ?? []).some((b) => b.toLowerCase().includes(needle))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="text-2xl font-bold">Reference sheet</h1>
        <p className="text-muted">Mechanics, comparisons, and traps. Searchable; print-friendly.</p>
        <div className="mt-3">
          <input className="input" placeholder="Search (e.g. ‘framing’, ‘RLS’, ‘pipeline’)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {categories.map((c) => <span key={c} className="badge">{c}</span>)}
        </div>
      </header>
      {filtered.map((s) => (
        <section key={s.slug} className="panel" id={s.slug}>
          <div className="mb-1 text-xs uppercase tracking-wider text-faint">{s.category}</div>
          <h2 className="mb-2 text-lg font-bold">{s.title}</h2>
          {s.paragraphs?.map((p, i) => (<p key={i} className="mb-2 text-sm text-muted">{p}</p>))}
          {s.bullets && (
            <ul className="ml-5 list-disc space-y-1 text-sm">{s.bullets.map((b, i) => (<li key={i}>{b}</li>))}</ul>
          )}
          {s.table && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>{s.table.headers.map((h) => (<th key={h} className="border-b border-border px-2 py-2 text-left text-xs uppercase text-faint">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {r.map((c, j) => (<td key={j} className="px-2 py-2 align-top">{c}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.warning && (
            <div className="mt-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
              <strong>Trap:</strong> {s.warning}
            </div>
          )}
          {s.code && (
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface3 p-3 text-xs"><code>{s.code.body}</code></pre>
          )}
          {s.slug === 'deployment-pipelines' && (
            <div className="mt-4 flex justify-center">
              <PipelineDiagram />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
