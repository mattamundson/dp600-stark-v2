/** Normalized Levenshtein similarity in [0,1]; 1.0 = identical. */
export function similarity(a: string, b: string): number {
  const x = norm(a), y = norm(b);
  if (!x.length && !y.length) return 1;
  const dist = levenshtein(x, y);
  return 1 - dist / Math.max(x.length, y.length);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let cur = i;
    let diag = i - 1;
    for (let j = 1; j <= b.length; j++) {
      const ins = cur + 1;
      const del = prev[j] + 1;
      const sub = diag + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1);
      diag = prev[j];
      prev[j] = cur;
      cur = Math.min(ins, del, sub);
    }
    prev[b.length] = cur;
  }
  return prev[b.length];
}
