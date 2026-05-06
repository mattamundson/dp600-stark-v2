import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { calcGroupPrompts, type CalcGroupPrompt } from '../../data/lab/calc-groups-prompts';
import { saveAttempt } from '../../lib/storage/db';
import { uid } from '../../lib/utils/id';
import type { Attempt } from '../../lib/schema';

export function CalcGroupsLabView() {
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const sessionIdRef = useRef<string>(uid('cgl-sess'));
  const promptStartRef = useRef<number>(Date.now());

  useEffect(() => {
    promptStartRef.current = Date.now();
  }, [cursor]);

  if (cursor >= calcGroupPrompts.length) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="font-display text-2xl font-bold">Calc Groups Lab complete</h1>
          <p className="text-muted">{correctCount} / {calcGroupPrompts.length} correct</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="btn btn-primary">Dashboard</Link>
          <Link to="/lab/calc-groups" reloadDocument className="btn">Run again</Link>
        </div>
      </div>
    );
  }

  const prompt = calcGroupPrompts[cursor];

  async function handlePick(optionId: string) {
    if (revealed || !prompt) return;
    const latencyMs = Date.now() - promptStartRef.current;
    const correct = optionId === prompt.correctId;
    setPickedId(optionId);
    setRevealed(true);
    if (correct) setCorrectCount((c) => c + 1);
    const attempt: Attempt = {
      id: uid('a'),
      questionId: 'cgl-' + prompt.id,
      sessionId: sessionIdRef.current,
      ts: Date.now(),
      selectedOptionIds: [optionId],
      correct,
      latencyMs,
      confidence: 'unsure',
      domain: 'semantic',
      subtopic: 'calc-groups',
      difficulty: prompt.difficulty
    };
    await saveAttempt(attempt);
  }

  function next() {
    setRevealed(false);
    setPickedId(null);
    setCursor((c) => c + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="badge">Prompt {cursor + 1} / {calcGroupPrompts.length}</span>
          <span className="badge">Semantic models</span>
          <span className="badge">D{prompt.difficulty}</span>
        </div>
        <div className="text-xs text-muted">
          {correctCount} / {cursor + (revealed ? 1 : 0)} correct
        </div>
      </header>

      <article className="panel flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-faint">Business</p>
        <p className="text-sm text-muted">{prompt.business}</p>
        <h2 className="font-display text-lg font-semibold leading-snug">{prompt.scenario}</h2>
        <div>
          <p className="mt-2 text-xs uppercase tracking-wider text-faint">Calc group</p>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface2 p-3 text-xs leading-relaxed"><code>{prompt.calcGroupDax}</code></pre>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Base measure</p>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface2 p-3 text-xs leading-relaxed"><code>{prompt.baseMeasureDax}</code></pre>
        </div>
      </article>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Calc items">
        {prompt.options.map((opt, i) => (
          <li key={opt.id}>
            <button
              type="button"
              role="radio"
              aria-checked={pickedId === opt.id}
              onClick={() => void handlePick(opt.id)}
              disabled={revealed}
              className={optionClass(opt.id, prompt.correctId, pickedId, revealed)}
            >
              <span className="kbd mr-2">{i + 1}</span>
              {opt.label}
            </button>
          </li>
        ))}
      </ul>

      {revealed && pickedId && <Explanation prompt={prompt} pickedId={pickedId} />}

      <footer className="panel-tight flex items-center justify-end">
        <button className="btn btn-primary" disabled={!revealed} onClick={next}>
          {cursor + 1 >= calcGroupPrompts.length ? 'Finish' : 'Next →'}
        </button>
      </footer>
    </div>
  );
}

function optionClass(id: string, correctId: string, pickedId: string | null, revealed: boolean): string {
  const base = 'choice w-full text-left';
  if (!revealed) return `${base} ${pickedId === id ? 'choice-selected' : ''}`;
  if (id === correctId) return `${base} choice-correct`;
  if (id === pickedId) return `${base} choice-incorrect`;
  return `${base} opacity-50`;
}

function Explanation({ prompt, pickedId }: { prompt: CalcGroupPrompt; pickedId: string }) {
  const correct = pickedId === prompt.correctId;
  return (
    <section className={`rounded-xl border px-4 py-3 text-sm ${correct ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad'}`}>
      <strong>{correct ? 'Correct' : 'Incorrect'}</strong>
      <p className="mt-2 text-text/90"><strong>Why:</strong> {prompt.explanation}</p>
      <ul className="mt-3 grid gap-1 text-xs text-muted">
        {prompt.options.map((opt) => {
          if (opt.id === prompt.correctId) return null;
          const note = prompt.whyWrong[opt.id];
          if (!note) return null;
          const picked = pickedId === opt.id;
          return (
            <li key={opt.id} className={picked ? 'text-bad' : ''}>
              <strong className="text-text">{opt.label}:</strong> {note}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
