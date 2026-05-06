import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSettings, restoreFromShadowIfEmpty, updateSettings } from '../../lib/storage/db';
import type { Settings } from '../../lib/schema';

interface SettingsCtx {
  settings: Settings | null;
  loading: boolean;
  patch: (p: Partial<Settings>) => Promise<void>;
}

const Ctx = createContext<SettingsCtx | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
      applyTheme(s.theme);
      applyReduceMotion(s.reduceMotion);
    });
    // Best-effort DR: restore attempts/sessions from localStorage shadow if
    // IndexedDB is empty (e.g., site-data clear). Runs in parallel with
    // settings load so it never delays first paint. Restored data appears
    // on next route mount that re-reads from IndexedDB.
    void restoreFromShadowIfEmpty().catch(() => null);
  }, []);

  // Theme=system: react to OS preference changes live without requiring a patch.
  useEffect(() => {
    if (settings?.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings?.theme]);

  const patch = useCallback(async (p: Partial<Settings>) => {
    const next = await updateSettings(p);
    setSettings(next);
    if (p.theme !== undefined) applyTheme(next.theme);
    if (p.reduceMotion !== undefined) applyReduceMotion(next.reduceMotion);
  }, []);

  return <Ctx.Provider value={{ settings, loading, patch }}>{children}</Ctx.Provider>;
}

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  const wantLight =
    theme === 'light' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
  root.classList.toggle('light', wantLight);
  root.classList.toggle('dark', !wantLight);
}

function applyReduceMotion(on: boolean) {
  document.documentElement.classList.toggle('reduce-motion', on);
}

export function useSettings(): SettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings outside provider');
  return v;
}
