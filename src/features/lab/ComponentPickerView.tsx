// Component Picker — runner UI for the 9-Fabric-component picker drill.
//
// Each prompt presents the same 9 canonical Fabric components; the user picks
// one. We persist an Attempt-shaped record per pick so the picker contributes
// to weak-area weighting and the per-domain analytics views (under the
// 'component-picker' subtopic).

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { pickerPrompts, type PickerPrompt } from '../../data/lab/picker-prompts';
import { saveAttempt } from '../../lib/storage/db';
import { uid } from '../../lib/utils/id';
import type { Attempt } from '../../lib/schema';

export function ComponentPickerView() {
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [ready, setReady] = useState(false);

  // One session id per mount — every Attempt this run is grouped under it.
  const sessionIdRef = useRef<string>(uid('picker-sess'));
  // Time the prompt was first rendered, used to compute latencyMs at pick time.
  const promptStartRef = useRef<number>(Date.now());

  useEffect(() => {
    setReady(pickerPrompts.length > 0);
  }, []);

  // Reset the per-prompt timer whenever the cursor advances.
  useEffect(() => {
    promptStartRef.current = Date.now();
  }, [cursor]);

  if (!ready) return <div className="panel">Loading…</div>;

  // End screen.
  if (cursor >= pickerPrompts.length) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="font-display text-2xl font-bold">Picker drill complete</h1>
          <p className="text-muted">
            {correctCount} / {pickerPrompts.length} correct
          </p>
        </header>
        <section className="panel grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-faint">Accuracy</div>
            <div className="font-display text-3xl font-bold">
              {Math.round((correctCount / pickerPrompts.length) * 100)}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-faint">Prompts</div>
            <div className="font-display text-3xl font-bold">{pickerPrompts.length}</div>
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          <Link to="/study-plan" className="btn btn-primary">
            Back to study plan
          </Link>
          <Link to="/lab/component-picker" reloadDocument className="btn">
            Run again
          </Link>
        </div>
      </div>
    );
  }

  const prompt = pickerPrompts[cursor];

  async function handlePick(optionId: string) {
    if (revealed || !prompt) return;
    const latencyMs = Date.now() - promptStartRef.current;
    const correct = optionId === prompt.correctId;

    setPickedId(optionId);
    setRevealed(true);
    if (correct) setCorrectCount((c) => c + 1);

    const attempt: Attempt = {
      id: uid('a'),
      questionId: 'picker-' + prompt.id,
      sessionId: sessionIdRef.current,
      ts: Date.now(),
      selectedOptionIds: [optionId],
      correct,
      latencyMs,
      confidence: 'unsure',
      domain: 'prepare',
      subtopic: 'component-picker',
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
          <span className="badge">
            Prompt {cursor + 1} / {pickerPrompts.length}
          </span>
          <span className="badge">Prepare data</span>
          <span className="badge">D{prompt.difficulty}</span>
        </div>
        <div className="text-xs text-muted">
          {correctCount} / {cursor + (revealed ? 1 : 0)} correct
        </div>
      </header>

      <PromptBody prompt={prompt} />

      <PickerOptions
        prompt={prompt}
        pickedId={pickedId}
        revealed={revealed}
        onPick={handlePick}
      />

      {revealed && pickedId && <Explanation prompt={prompt} pickedId={pickedId} />}

      <footer className="panel-tight flex items-center justify-between text-xs">
        <div className="text-faint">
          <span className="kbd">1–9</span> select option &nbsp; <span className="kbd">Enter</span> next
        </div>
        <button
          className="btn btn-primary"
          disabled={!revealed}
          onClick={next}
        >
          {cursor + 1 >= pickerPrompts.length ? 'Finish' : 'Next →'}
        </button>
      </footer>
    </div>
  );
}

function PromptBody({ prompt }: { prompt: PickerPrompt }) {
  return (
    <article className="panel flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wider text-faint">Business</p>
      <p className="text-sm text-muted">{prompt.business}</p>
      <h2 className="font-display text-lg font-semibold leading-snug">{prompt.scenario}</h2>
    </article>
  );
}

interface PickerOptionsProps {
  prompt: PickerPrompt;
  pickedId: string | null;
  revealed: boolean;
  onPick: (id: string) => void;
}

function PickerOptions({ prompt, pickedId, revealed, onPick }: PickerOptionsProps) {
  // Keyboard 1-9 → option index 0-8.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (revealed) return;
      const num = Number(e.key);
      if (!isNaN(num) && num >= 1 && num <= prompt.options.length) {
        e.preventDefault();
        onPick(prompt.options[num - 1].id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt.id, revealed, onPick]);

  return (
    <ul
      className="grid grid-cols-1 gap-2 md:grid-cols-3"
      role="radiogroup"
      aria-label="Fabric components"
    >
      {prompt.options.map((opt, i) => (
        <li key={opt.id}>
          <button
            type="button"
            role="radio"
            aria-checked={pickedId === opt.id}
            onClick={() => onPick(opt.id)}
            disabled={revealed}
            className={optionClass(opt.id, prompt.correctId, pickedId, revealed)}
          >
            <span className="kbd mr-2">{i + 1}</span>
            {opt.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function optionClass(
  id: string,
  correctId: string,
  pickedId: string | null,
  revealed: boolean
): string {
  const base = 'choice w-full text-left';
  if (!revealed) {
    return `${base} ${pickedId === id ? 'choice-selected' : ''}`;
  }
  // Post-reveal coloring.
  if (id === correctId && id === pickedId) return `${base} choice-correct`;
  if (id === correctId && id !== pickedId) return `${base} choice-correct`;
  if (id !== correctId && id === pickedId) return `${base} choice-incorrect`;
  return `${base} opacity-50`;
}

function Explanation({ prompt, pickedId }: { prompt: PickerPrompt; pickedId: string }) {
  const correct = pickedId === prompt.correctId;
  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${
        correct ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad'
      }`}
    >
      <div className="flex items-center justify-between">
        <strong>{correct ? 'Correct' : 'Incorrect'}</strong>
        <span className="text-xs uppercase tracking-wider text-muted">
          {prompt.options.find((o) => o.id === prompt.correctId)?.label ?? prompt.correctId}
        </span>
      </div>
      <p className="mt-2 text-text/90">
        <strong>Why:</strong> {prompt.explanation}
      </p>
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
