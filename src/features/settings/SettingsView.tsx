import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/providers/SettingsProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { exportAll, importAll, ImportError, listAttempts, wipeAll } from '../../lib/storage/db';
import { questionBank } from '../../data/questions';
import { csvFile, downloadCsv } from '../../lib/utils/csv';

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

  async function doExportAttemptsCsv() {
    const attempts = await listAttempts();
    const headers = [
      'id', 'sessionId', 'questionId', 'ts', 'iso', 'domain', 'subtopic',
      'difficulty', 'correct', 'partial', 'latencyMs', 'confidence',
      'selectedOptionIds', 'selectedOrder'
    ];
    const rows = attempts.map((a) => [
      a.id,
      a.sessionId,
      a.questionId,
      a.ts,
      new Date(a.ts).toISOString(),
      a.domain,
      a.subtopic,
      a.difficulty,
      a.correct ? 'true' : 'false',
      a.partial ?? '',
      a.latencyMs,
      a.confidence,
      (a.selectedOptionIds ?? []).join(','),
      (a.selectedOrder ?? []).join(',')
    ]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`dp600-stark-attempts-${today}.csv`, csvFile(headers, rows));
    push(`Exported ${attempts.length} attempts to CSV`, 'ok');
  }

  function doExportBankCsv() {
    const headers = [
      'id', 'type', 'domain', 'subtopic', 'difficulty', 'prompt',
      'options', 'correctOptionIds', 'correctOrder', 'explanation',
      'whyWrong', 'tags', 'scenarioId', 'scenarioTitle', 'relatedIds',
      'sourceCategory', 'sourceNote'
    ];
    const rows = questionBank.map((q) => [
      q.id,
      q.type,
      q.domain,
      q.subtopic,
      q.difficulty,
      q.prompt,
      (q.options ?? []).map((o) => `${o.id}: ${o.text}`).join(' | '),
      (q.correctOptionIds ?? []).join(','),
      (q.correctOrder ?? []).join(','),
      q.explanation,
      Object.entries(q.whyWrong ?? {}).map(([k, v]) => `${k}: ${v}`).join(' | '),
      q.tags.join(','),
      q.scenarioId ?? '',
      q.scenarioTitle ?? '',
      (q.relatedIds ?? []).join(','),
      q.sourceAnchor.category,
      q.sourceAnchor.note
    ]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`dp600-stark-bank-${today}.csv`, csvFile(headers, rows));
    push(`Exported ${questionBank.length} questions to CSV`, 'ok');
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
          <label className="flex flex-col gap-2 text-sm" id="exam-date">
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
          <label className="flex items-center gap-2 text-sm" title="Hides decorative dashboard / cockpit panels so only timer + question + options remain. Use during your final week.">
            <input
              type="checkbox"
              checked={settings.examDayMode ?? false}
              onChange={(e) => void patch({ examDayMode: e.target.checked })}
            />
            Exam-day focus mode
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Simulation realism mode</span>
            <select
              className="input"
              value={settings.simRealismMode ?? 'dp600'}
              onChange={(e) =>
                void patch({ simRealismMode: e.target.value as 'dp600' | 'dp600-quick' | 'legacy' })
              }
            >
              <option value="dp600">DP-600 full · 65 Q / 100 min</option>
              <option value="dp600-quick">DP-600 quick · 25 Q / 35 min</option>
              <option value="legacy">Legacy · pre-realism behavior</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Data</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => void doExport()}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <button className="btn" onClick={doExportBankCsv}>Export bank CSV</button>
          <button className="btn" onClick={() => void doExportAttemptsCsv()}>Export attempts CSV</button>
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
          JSON export includes settings, sessions, attempts, and SRS state — Import replaces existing data.
          Bank CSV exports the question bank only (id, prompt, options, answers, explanation) for peer review and audit.
          Attempts CSV exports your answer history (one row per attempt) for spreadsheet analysis or off-device backup.
        </p>
      </section>
    </div>
  );
}
