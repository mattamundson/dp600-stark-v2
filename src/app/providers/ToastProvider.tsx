import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { uid } from '../../lib/utils/id';

type Tone = 'ok' | 'warn' | 'bad' | 'info';
interface Toast { id: string; tone: Tone; message: string }
interface ToastCtx { push: (message: string, tone?: Tone) => void }

const Ctx = createContext<ToastCtx | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = uid('t');
    setToasts((cur) => [...cur, { id, tone, message }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-2 text-sm shadow-lg backdrop-blur ${
              t.tone === 'ok'
                ? 'border-ok/30 bg-ok/10 text-ok'
                : t.tone === 'bad'
                ? 'border-bad/30 bg-bad/10 text-bad'
                : t.tone === 'warn'
                ? 'border-warn/30 bg-warn/10 text-warn'
                : 'border-cyan/30 bg-cyan/10 text-cyan'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast outside provider');
  return v;
}
