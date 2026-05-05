import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/providers/SettingsProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { exportAll, importAll, ImportError, wipeAll } from '../../lib/storage/db';

export function SettingsView() {
  const { settings, patch } = useSettings();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [examDate, setExamDate] = useState('');

  useEffect(() => {
    if (settings?.examDateIso) setExamDate(settings.examDateIso.slice(0, 10));
  }, [settings?.examDateIso]);

  if (!settings) return null;

  async function doExport() {
    const env = await exportAll();
    const blob = new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dp600-stark-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    push('Exported study data', 'ok');
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch { throw new ImportError('File is not valid JSON', 'BAD_JSON'); }
      const { counts } = await importAll(parsed);
      push(`Imported ${counts.sessions} sessions, ${counts.attempts} attempts, ${counts.srs} cards`, 'ok');
    } catch (err) {
      const msg = err instanceof ImportError ? `Import failed: ${err.code} — ${err.message}` : `Import failed: ${(err as Error).message}`;
      push(msg, 'bad');
    }
  }

  async function doWipe() {
    if (!confirm('Wipe all study data? This cannot be undone.')) return;
    await wipeAll();
    push('All study data wiped', 'warn');
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <h1 className="mb-3 text-xl font-bold">Settings</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Theme</span>
            <select
              className="input"
              value={settings.theme}
              onChange={(e) => void patch({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">Follow system</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Exam date</span>
            <input
              type="date"
              className="input"
              value={examDate}
              onChange={(e) => {
                setExamDate(e.target.value);
                void patch({ examDateIso: e.target.value ? new Date(e.target.value).toISOString() : undefined });
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => void patch({ reduceMotion: e.target.checked })}
            />
            Reduce motion
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.beepOnFinalMinute}
              onChange={(e) => void patch({ beepOnFinalMinute: e.target.checked })}
            />
            Beep at final minute (simulation)
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Data</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => void doExport()}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <button className="btn btn-danger" onClick={() => void doWipe()}>Wipe all data</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="mt-3 text-xs text-faint">
          Exports include settings, sessions, attempts, and SRS state. Import replaces existing data.
        </p>
      </section>
    </div>
  );
}
