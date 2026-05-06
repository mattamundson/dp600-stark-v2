// Service-worker update prompt. vite-plugin-pwa is configured with
// `registerType: 'autoUpdate'`, which downloads new SWs in the background;
// the new SW only activates after every tab closes (or the user reloads).
// This component surfaces a tiny banner the moment the new SW is waiting
// so the user can choose to reload immediately — important pre-exam so
// any deployed bug fix actually reaches the installed PWA quickly.

import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError(error) {
      // Dev / test environments may not register a SW — log only.
      console.warn('[stark-v2] SW registration error', error);
    }
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-primary/40 bg-bg/95 px-4 py-3 text-sm shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span>New version available.</span>
        <button
          type="button"
          className="btn btn-primary text-xs"
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
        <button
          type="button"
          className="btn text-xs"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}
