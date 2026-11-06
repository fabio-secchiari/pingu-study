import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { uid } from '../types';
import { realmPatch } from '../lib/cloud';
import { daysUntil } from '../lib/text';
import { isDue, statusOf } from '../lib/srs';
import Penguin from '../components/Penguin';

export default function SubjectsPage() {
  const [name, setName] = useState('');
  const subjects = useLiveQuery(() => db.subjects.orderBy('createdAt').reverse().toArray(), []);
  const stats = useLiveQuery(async () => {
    const chapters = await db.chapters.toArray();
    const items = await db.items.toArray();
    const map: Record<string, { c: number; i: number; m: number; due: number }> = {};
    const get = (id: string) => (map[id] ??= { c: 0, i: 0, m: 0, due: 0 });
    for (const ch of chapters) get(ch.subjectId).c++;
    for (const it of items) {
      const s = get(it.subjectId);
      s.i++;
      if (statusOf(it) === 'padroneggiato') s.m++;
      if (isDue(it)) s.due++;
    }
    return map;
  }, []);

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await db.subjects.add({
      id: uid(),
      name: name.trim(),
      color: Math.random() > 0.5 ? 'blue' : 'pink',
      createdAt: Date.now(),
      ...realmPatch(),
    });
    setName('');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={addSubject} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aggiungi una materia… (es. Analisi 1)"
          aria-label="Nuova materia"
          className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-2xl bg-penguin-blue text-white font-medium hover:bg-penguin-blue-dark transition"
        >
          Aggiungi
        </button>
      </form>

      {subjects && subjects.length === 0 && (
        <div className="text-center py-12 text-ink/60">
          <Penguin color="pink" className="w-24 h-24 mx-auto mb-4" />
          <p>Nessuna materia ancora. Aggiungi la prima qui sopra! 🐧</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((s) => {
          const st = stats?.[s.id];
          const days = s.examDate ? daysUntil(s.examDate) : null;
          const pct = st?.i ? Math.round((st.m / st.i) * 100) : 0;
          return (
            <Link
              key={s.id}
              to={`/subject/${s.id}`}
              className="group relative p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="flex items-start gap-3">
                <Penguin
                  color={s.color === 'pink' ? 'pink' : 'blue'}
                  accessory={s.examPassed ? 'tocco' : 'none'}
                  className="w-12 h-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate">{s.name}</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    {st?.c ?? 0} capitoli · {st?.i ?? 0} elementi
                    {st?.due ? ` · ${st.due} da ripassare` : ''}
                  </p>
                </div>
              </div>
              {(st?.i ?? 0) > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-ink/50 tabular-nums">{pct}%</span>
                </div>
              )}
              {s.examPassed ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  ✅ Superato{s.examGrade ? ` · ${s.examGrade}` : ''}
                </p>
              ) : days !== null && days >= 0 ? (
                <p
                  className={`mt-2 text-xs font-medium ${
                    days <= 7 ? 'text-penguin-pink-dark' : 'text-penguin-blue-dark'
                  }`}
                >
                  {days === 0 ? '📅 Esame oggi! In bocca al pinguino' : `📅 Esame tra ${days} ${days === 1 ? 'giorno' : 'giorni'}`}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
