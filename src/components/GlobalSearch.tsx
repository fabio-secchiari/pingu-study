import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TYPE_COLORS, TYPE_LABELS } from '../types';
import { compareTitles, matches, plain } from '../lib/text';
import MathText from './MathText';

/** Ricerca in tutte le materie: ⌘K / Ctrl+K oppure il pulsante 🔍 nell'header. */
export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useLiveQuery(() => (open ? db.items.toArray() : []), [open]) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const pq = plain(q);
    return items
      .filter((i) => matches(q, i.title, i.description, i.proofText))
      // Prima chi ha la parola nel titolo
      .sort((a, b) => Number(!plain(a.title).includes(pq)) - Number(!plain(b.title).includes(pq)) || compareTitles(a.title, b.title))
      .slice(0, 30);
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const go = (i: number) => {
    const it = results[i];
    if (!it) return;
    onClose();
    nav(`/subject/${it.subjectId}?item=${it.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex justify-center p-4 pt-[10vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden self-start"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Cerca"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(results.length - 1, s + 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)));
            if (e.key === 'Enter') go(sel);
          }}
          placeholder="Cerca un teorema, una definizione… in tutte le materie"
          aria-label="Cerca in tutte le materie"
          className="w-full px-5 py-4 text-lg border-b border-penguin-blue-soft focus:outline-none"
        />
        <ul className="max-h-[60vh] overflow-y-auto">
          {q.trim() && results.length === 0 && <li className="px-5 py-6 text-center text-ink/50">Nessun risultato 🐧</li>}
          {results.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(i)}
                className={`w-full text-left px-5 py-3 flex items-center gap-3 ${i === sel ? 'bg-penguin-blue-soft' : ''}`}
              >
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[it.type]}`}>
                  {TYPE_LABELS[it.type]}
                </span>
                <MathText className="flex-1 truncate font-medium">{it.title}</MathText>
                <span className="text-xs text-ink/40 shrink-0">{subjects.find((s) => s.id === it.subjectId)?.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
