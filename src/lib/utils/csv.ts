// Tiny CSV utilities — RFC 4180 compliant escape (quote any field containing
// comma / quote / newline; double-up internal quotes). No third-party dep.
//
// Used by the question-bank CSV export in Settings (peer review / sharing).

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(',');
}

export function csvFile(headers: string[], rows: unknown[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  // Use CRLF per RFC 4180 — Excel-friendly on Windows.
  return lines.join('\r\n') + '\r\n';
}

/** Trigger a browser download for the given text content. */
export function downloadCsv(filename: string, content: string): void {
  // Add UTF-8 BOM so Excel auto-detects encoding for non-ASCII.
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
