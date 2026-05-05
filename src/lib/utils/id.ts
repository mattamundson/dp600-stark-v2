/** Compact, sortable-ish id generator. Crypto-random when available, fallback to Math.random. */
export function uid(prefix = ''): string {
  const t = Date.now().toString(36);
  let r: string;
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    r = Array.from(arr, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
  } else {
    r = Math.random().toString(36).slice(2, 12);
  }
  return prefix ? `${prefix}_${t}_${r}` : `${t}_${r}`;
}
