import { useEffect, useMemo, useState } from 'react';
import { flashcards, flashcardsByDeck } from '../../data/flashcards';
import { DECK_LABEL, DECKS, type Flashcard, type FlashcardDeck } from '../../lib/schema';
import { dueSrs, getSrs, listAllSrs, saveSrs } from '../../lib/storage/db';
import { initialSrs, review, type Grade } from '../../lib/scoring/srs';
import { useToast } from '../../app/providers/ToastProvider';

export function FlashcardsView() {
  const [deck, setDeck] = useState<FlashcardDeck | 'due'>('due');
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState<{ deck: Record<string, number>; dueNow: number }>({ deck: {}, dueNow: 0 });
  const { push } = useToast();

  useEffect(() => { void rebuildStats(); }, []);

  async function rebuildStats() {
    const allSrs = await listAllSrs();
    const deckCounts: Record<string, number> = {};
    for (const f of flashcards) deckCounts[f.deck] = (deckCounts[f.deck] ?? 0) + 1;
    const due = await dueSrs(Date.now());
    // also count cards never seen as "due"
    const seen = new Set(allSrs.map((s) => s.cardId));
    const unseen = flashcards.filter((f) => !seen.has(f.id)).length;
    setStats({ deck: deckCounts, dueNow: due.length + unseen });
  }

  async function loadDeck(d: FlashcardDeck | 'due') {
    setDeck(d);
    setCursor(0);
    setFlipped(false);
    if (d === 'due') {
      const allSrs = await listAllSrs();
      const dueIds = new Set(allSrs.filter((s) => s.due <= Date.now()).map((s) => s.cardId));
      const seen = new Set(allSrs.map((s) => s.cardId));
      const due: Flashcard[] = flashcards.filter((f) => dueIds.has(f.id) || !seen.has(f.id));
      setQueue(shuffle(due).slice(0, 50));
    } else {
      setQueue(flashcardsByDeck(d));
    }
  }

  useEffect(() => { void loadDeck('due'); }, []);

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === '1' && flipped) void grade(0);
      else if (e.key === '2' && flipped) void grade(3);
      else if (e.key === '3' && flipped) void grade(4);
      else if (e.key === '4' && flipped) void grade(5);
      else if (e.key.toLowerCase() === 'j') setCursor((c) => Math.min(queue.length - 1, c + 1));
      else if (e.key.toLowerCase() === 'k') setCursor((c) => Math.max(0, c - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, queue.length]);

  async function grade(g: Grade) {
    const card = queue[cursor];
    if (!card) return;
    const cur = (await getSrs(card.id)) ?? initialSrs(card.id);
    const next = review(cur, g);
    await saveSrs(next);
    push(`${g === 0 ? 'Again' : g === 3 ? 'Hard' : g === 4 ? 'Good' : 'Easy'} → next due in ${formatDays(next.due - Date.now())}`, g === 0 ? 'warn' : 'ok');
    setFlipped(false);
    if (cursor + 1 >= queue.length) {
      void rebuildStats();
      setCursor(0);
    } else {
      setCursor((c) => c + 1);
    }
  }

  const card = queue[cursor];
  const totalInDeck = useMemo(() => (deck === 'due' ? queue.length : flashcards.filter((f) => f.deck === deck).length), [deck, queue.length]);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="text-xl font-bold">Flashcards</h1>
        <p className="text-muted">Spaced repetition. <span className="kbd">Space</span> flip · <span className="kbd">1</span>=again <span className="kbd">2</span>=hard <span className="kbd">3</span>=good <span className="kbd">4</span>=easy · <span className="kbd">J/K</span> next/prev.</p>
      </header>

      <section className="panel">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadDeck('due')} className={`btn ${deck === 'due' ? 'btn-primary' : ''}`}>Due now ({stats.dueNow})</button>
          {DECKS.map((d) => (
            <button key={d} onClick={() => void loadDeck(d)} className={`btn ${deck === d ? 'btn-primary' : ''}`}>
              {DECK_LABEL[d]} ({stats.deck[d] ?? 0})
            </button>
          ))}
        </div>
      </section>

      {!card ? (
        <section className="panel"><p className="text-muted">No cards in this view. Phase 4 seeds 135+ flashcards.</p></section>
      ) : (
        <section className="panel">
          <div className="mb-3 flex items-center justify-between text-xs text-muted">
            <span>{DECK_LABEL[card.deck]}</span>
            <span>{cursor + 1} / {totalInDeck}</span>
          </div>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="mx-auto block min-h-[180px] w-full max-w-2xl rounded-2xl border border-border bg-surface2 p-6 text-left transition hover:border-primary/40 focus:outline-none"
            aria-pressed={flipped}
          >
            <div className="mb-2 text-xs uppercase tracking-widest text-faint">{flipped ? 'Back' : 'Front'}</div>
            <div className="whitespace-pre-wrap text-base leading-relaxed">{flipped ? card.back : card.front}</div>
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="btn btn-danger" disabled={!flipped} onClick={() => void grade(0)}>Again (1)</button>
            <button className="btn" disabled={!flipped} onClick={() => void grade(3)}>Hard (2)</button>
            <button className="btn" disabled={!flipped} onClick={() => void grade(4)}>Good (3)</button>
            <button className="btn btn-primary" disabled={!flipped} onClick={() => void grade(5)}>Easy (4)</button>
          </div>
        </section>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDays(ms: number): string {
  if (ms < 60_000) return 'a few seconds';
  if (ms < 3600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)} hr`;
  return `${Math.round(ms / 86400_000)} days`;
}
