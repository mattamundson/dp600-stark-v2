// Pure presentational component for rendering ONE question + collecting an answer.
// Used by quiz, simulation, scenarios, and remediation runners. No persistence here.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Confidence, Question } from '../lib/schema';

export interface PlayerAnswer {
  selectedOptionIds?: string[];
  selectedOrder?: string[];
  confidence: Confidence;
}

export interface ResultDisplay {
  correct: boolean;
  partial: number;
}

interface Props {
  question: Question;
  index?: number;
  total?: number;
  /** when present, render the verdict overlay (used by adaptive quiz / remediation) */
  result?: ResultDisplay;
  /** when present, lock answers and display correct/incorrect markers (post-submit) */
  reveal?: boolean;
  /** controlled state: lift answer up so simulation can persist it */
  value?: { selectedOptionIds?: string[]; selectedOrder?: string[]; confidence?: Confidence };
  defaultConfidence?: Confidence;
  /** Submit/Next button labels */
  primaryLabel?: string;
  secondaryLabel?: string;
  onChange?: (a: { selectedOptionIds?: string[]; selectedOrder?: string[]; confidence: Confidence }) => void;
  onSubmit?: (a: PlayerAnswer) => void;
  onNext?: () => void;
  /** when supplied, render a flag toggle */
  flagged?: boolean;
  onFlagToggle?: () => void;
}

export function QuestionPlayer(props: Props) {
  const { question: q } = props;
  const initialOrder = useMemo(() => (q.options ?? []).map((o) => o.id), [q.id]);
  const [selected, setSelected] = useState<string[]>(props.value?.selectedOptionIds ?? []);
  const [order, setOrder] = useState<string[]>(props.value?.selectedOrder ?? initialOrder);
  const [orderCursor, setOrderCursor] = useState(0);
  const [confidence, setConfidence] = useState<Confidence>(
    props.value?.confidence ?? props.defaultConfidence ?? 'unsure'
  );
  const isMulti = q.type === 'multi' || q.type === 'scenario-multi';
  const isOrdering = q.type === 'ordering';
  const locked = Boolean(props.reveal);

  // sync incoming controlled value (e.g., simulation cursor change)
  useEffect(() => {
    setSelected(props.value?.selectedOptionIds ?? []);
    setOrder(props.value?.selectedOrder ?? initialOrder);
    setConfidence(props.value?.confidence ?? props.defaultConfidence ?? 'unsure');
  }, [q.id, props.value?.selectedOptionIds?.join(','), props.value?.selectedOrder?.join(','), props.value?.confidence, initialOrder, props.defaultConfidence]);

  const fire = (next: Partial<{ selectedOptionIds: string[]; selectedOrder: string[]; confidence: Confidence }>) => {
    props.onChange?.({
      selectedOptionIds: next.selectedOptionIds ?? selected,
      selectedOrder: next.selectedOrder ?? (isOrdering ? order : undefined),
      confidence: next.confidence ?? confidence
    });
  };

  function toggle(id: string) {
    if (locked) return;
    if (isMulti) {
      const ns = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      setSelected(ns);
      fire({ selectedOptionIds: ns });
    } else {
      setSelected([id]);
      fire({ selectedOptionIds: [id] });
    }
  }

  function moveOrder(id: string, dir: -1 | 1) {
    if (locked) return;
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    fire({ selectedOrder: next });
  }

  function chooseConfidence(c: Confidence) {
    if (locked) return;
    setConfidence(c);
    fire({ confidence: c });
  }

  function submit() {
    if (!props.onSubmit) return;
    props.onSubmit({
      selectedOptionIds: isOrdering ? undefined : selected,
      selectedOrder: isOrdering ? order : undefined,
      confidence
    });
  }

  // keyboard handling — bind once per question
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (locked && !props.onNext) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const opts = q.options ?? [];
      const num = Number(e.key);
      if (!isNaN(num) && num >= 1 && num <= opts.length && !isOrdering) {
        e.preventDefault();
        toggle(opts[num - 1].id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (locked) props.onNext?.(); else if (props.onSubmit) submit();
      } else if (e.key.toLowerCase() === 's' && !locked) {
        e.preventDefault();
        chooseConfidence('sure');
      } else if (e.key.toLowerCase() === 'u' && !locked) {
        e.preventDefault();
        chooseConfidence('unsure');
      } else if (e.key.toLowerCase() === 'g' && !locked) {
        e.preventDefault();
        chooseConfidence('guess');
      } else if (e.key === 'f' && props.onFlagToggle) {
        e.preventDefault();
        props.onFlagToggle();
      } else if (isOrdering && !locked && (e.key === 'j' || e.key === 'J')) {
        // Move highlighted ordering item DOWN one position
        e.preventDefault();
        if (orderCursor < order.length - 1) {
          moveOrder(order[orderCursor], 1);
          setOrderCursor((c) => Math.min(order.length - 1, c + 1));
        }
      } else if (isOrdering && !locked && (e.key === 'k' || e.key === 'K')) {
        // Move highlighted ordering item UP one position
        e.preventDefault();
        if (orderCursor > 0) {
          moveOrder(order[orderCursor], -1);
          setOrderCursor((c) => Math.max(0, c - 1));
        }
      } else if (isOrdering && !locked && e.key === 'ArrowDown') {
        e.preventDefault();
        setOrderCursor((c) => Math.min(order.length - 1, c + 1));
      } else if (isOrdering && !locked && e.key === 'ArrowUp') {
        e.preventDefault();
        setOrderCursor((c) => Math.max(0, c - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q.id, selected.join(','), order.join(','), confidence, locked, orderCursor, isOrdering]);

  const correctSet = new Set(q.correctOptionIds ?? []);
  function optionClassName(id: string): string {
    if (!locked) return `choice ${selected.includes(id) ? 'choice-selected' : ''}`;
    const chosen = selected.includes(id);
    if (correctSet.has(id) && chosen) return 'choice choice-correct';
    if (correctSet.has(id) && !chosen) return 'choice choice-missed';
    if (!correctSet.has(id) && chosen) return 'choice choice-incorrect';
    return 'choice opacity-50';
  }

  return (
    <article ref={containerRef} className="panel flex flex-col gap-4" aria-label="Question">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          {props.index !== undefined && props.total !== undefined && (
            <span className="badge">Question {props.index + 1} / {props.total}</span>
          )}
          <span className="badge">{q.domain}</span>
          <span className="badge">{q.subtopic}</span>
          <span className="badge">D{q.difficulty}</span>
          {q.scenarioTitle && <span className="badge badge-info">Scenario · {q.scenarioTitle}</span>}
        </div>
        <div className="flex items-center gap-2">
          {props.onFlagToggle && (
            <button className={`btn ${props.flagged ? 'btn-danger' : 'btn-ghost'}`} onClick={props.onFlagToggle} aria-pressed={!!props.flagged}>
              {props.flagged ? '★ Flagged' : '☆ Flag'}
            </button>
          )}
        </div>
      </header>

      <h2 className="font-display text-lg font-semibold leading-snug">{q.prompt}</h2>

      {isOrdering ? (
        <ol className="flex flex-col gap-2" aria-label="Ordering">
          {order.map((id, i) => {
            const opt = q.options?.find((o) => o.id === id);
            const highlighted = !locked && i === orderCursor;
            return (
              <li
                key={id}
                onClick={() => !locked && setOrderCursor(i)}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                  highlighted
                    ? 'border-primary/60 bg-primary/15 cursor-pointer'
                    : 'border-border bg-surface2 cursor-pointer'
                }`}
              >
                <span className="text-sm">
                  <span className="mr-3 inline-block w-6 text-right font-mono text-muted">{i + 1}.</span>
                  {opt?.text}
                </span>
                <span className="flex gap-1">
                  <button className="btn-ghost btn h-8 px-2 py-1" onClick={(e) => { e.stopPropagation(); moveOrder(id, -1); }} aria-label="Move up" disabled={locked || i === 0}>↑</button>
                  <button className="btn-ghost btn h-8 px-2 py-1" onClick={(e) => { e.stopPropagation(); moveOrder(id, 1); }} aria-label="Move down" disabled={locked || i === order.length - 1}>↓</button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={isMulti ? 'Multiple-choice options' : 'Single-choice options'} role={isMulti ? 'group' : 'radiogroup'}>
          {q.options?.map((o, i) => (
            <li key={o.id}>
              <button
                role={isMulti ? 'checkbox' : 'radio'}
                aria-checked={selected.includes(o.id)}
                className={optionClassName(o.id)}
                onClick={() => toggle(o.id)}
              >
                <span className="kbd mr-2">{i + 1}</span>
                {o.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
          <legend className="mr-2 text-xs text-faint">Confidence</legend>
          {(['sure', 'unsure', 'guess'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => chooseConfidence(c)}
              className={`btn px-3 py-1.5 text-xs ${confidence === c ? 'btn-primary' : ''}`}
              aria-pressed={confidence === c}
            >
              {c === 'sure' ? 'S Sure' : c === 'unsure' ? 'U Unsure' : 'G Guess'}
            </button>
          ))}
        </fieldset>
      )}

      {props.result && locked && <Verdict q={q} result={props.result} chosen={selected} chosenOrder={isOrdering ? order : undefined} />}

      <footer className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-faint">
          <span className="kbd">1–9</span> select &nbsp; <span className="kbd">Enter</span> {locked ? 'next' : 'submit'} &nbsp; <span className="kbd">S/U/G</span> confidence
          {props.onFlagToggle && <> &nbsp; <span className="kbd">F</span> flag</>}
          {isOrdering && <> &nbsp; <span className="kbd">J/K</span> reorder</>}
        </div>
        <div className="flex gap-2">
          {!locked && props.onSubmit && (
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={!isOrdering && selected.length === 0}
            >
              {props.primaryLabel ?? 'Submit'}
            </button>
          )}
          {locked && props.onNext && (
            <button className="btn btn-primary" onClick={props.onNext}>
              {props.secondaryLabel ?? 'Next →'}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function Verdict({ q, result, chosen, chosenOrder }: { q: Question; result: ResultDisplay; chosen: string[]; chosenOrder?: string[] }) {
  const correctSet = new Set(q.correctOptionIds ?? []);
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${result.correct ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad'}`}>
      <div className="flex items-center justify-between">
        <strong>{result.correct ? 'Correct' : result.partial > 0 ? `Partial (${Math.round(result.partial * 100)}%)` : 'Incorrect'}</strong>
        <span className="text-xs uppercase tracking-wider text-muted">
          {q.sourceAnchor.category}
        </span>
      </div>
      <p className="mt-2 text-text/90">{q.explanation}</p>
      {q.whyWrong && (
        <ul className="mt-3 grid gap-1 text-xs text-muted">
          {(q.options ?? []).map((o) => {
            const wrongNote = q.whyWrong?.[o.id];
            if (!wrongNote || correctSet.has(o.id)) return null;
            const picked = chosen.includes(o.id);
            return (
              <li key={o.id} className={picked ? 'text-bad' : ''}>
                <strong className="text-text">{o.text}:</strong> {wrongNote}
              </li>
            );
          })}
        </ul>
      )}
      {chosenOrder && q.correctOrder && (
        <div className="mt-3 grid gap-1 text-xs text-muted">
          <div><strong className="text-text">Your order:</strong> {chosenOrder.map(idToText(q)).join(' → ')}</div>
          <div><strong className="text-text">Correct order:</strong> {q.correctOrder.map(idToText(q)).join(' → ')}</div>
        </div>
      )}
      <div className="mt-2 text-[11px] text-faint">{q.sourceAnchor.note}</div>
    </div>
  );
}

function idToText(q: Question) {
  return (id: string) => q.options?.find((o) => o.id === id)?.text ?? id;
}
