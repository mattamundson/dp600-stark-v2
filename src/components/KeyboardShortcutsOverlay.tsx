// Global "?" overlay listing all keyboard shortcuts the app supports.
// Mounted in main.tsx alongside PwaUpdatePrompt so it works under every route.
//
// Triggers:
//   "?" (Shift+/) — open
//   Esc          — close
//
// Suppressed when an input/textarea/contenteditable element is focused so
// typing "?" inside a form field doesn't open the overlay.

import { useEffect, useState } from 'react';

interface Shortcut {
  keys: string;
  context: string;
  action: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: '?',          context: 'Anywhere',           action: 'Open this shortcuts overlay' },
  { keys: 'Esc',        context: 'Overlays / modals',  action: 'Close' },
  { keys: '1–9',        context: 'Single-pick / multi',action: 'Toggle the Nth option' },
  { keys: '1–9',        context: 'Component Picker',   action: 'Pick the Nth Fabric component' },
  { keys: '1–9',        context: 'Question palette',   action: 'Jump to question N (drill / sim)' },
  { keys: 'J / K',      context: 'Ordering questions', action: 'Move highlighted item down / up' },
  { keys: 'Enter',      context: 'Question player',    action: 'Submit / next' },
  { keys: 'Ctrl + P',   context: '/cheat-sheet',       action: 'Open print dialog (Save as PDF)' },
  { keys: 'F',          context: 'Sim v2 player',      action: 'Flag the current question' },
  { keys: '←  →',       context: 'Sim v2 palette',     action: 'Previous / next question' }
];

function isFormElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      if (e.key === '?' && !isFormElement(e.target)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-bg p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="kbd-shortcuts-title" className="text-lg font-bold">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts overlay"
          >
            Close
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-faint">
              <th className="py-2 pr-3">Keys</th>
              <th className="py-2 pr-3">Where</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="py-2 pr-3">
                  <span className="kbd">{s.keys}</span>
                </td>
                <td className="py-2 pr-3 text-muted">{s.context}</td>
                <td className="py-2">{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-faint">
          Press <span className="kbd">?</span> anytime to reopen this list.
        </p>
      </div>
    </div>
  );
}
