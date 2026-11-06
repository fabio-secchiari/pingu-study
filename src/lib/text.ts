/** Testo "piatto" per ricerca e ordinamento: niente LaTeX, markdown, accenti o maiuscole. */
export function plain(s: string | undefined): string {
  return (s ?? '')
    .replace(/\\[a-zA-Z]+/g, (m) => ' ' + m.slice(1) + ' ') // \lim -> lim
    .replace(/[$*_=^{}\\[\]#>`~|]/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tutte le parole della query devono comparire nel testo. */
export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = plain(query);
  if (!q) return true;
  const hay = fields.map(plain).join(' ');
  return q.split(' ').every((w) => hay.includes(w));
}

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
export const compareTitles = (a: string, b: string) => collator.compare(plain(a), plain(b));

/** YYYY-MM-DD in ora locale */
export function localDay(t: number | Date = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Giorni interi da oggi alla data (negativo se passata). */
export function daysUntil(isoDay: string): number {
  const [y, m, d] = isoDay.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}
