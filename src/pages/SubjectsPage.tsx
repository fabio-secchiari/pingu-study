import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { uid } from '../types';

export default function SubjectsPage() {
  const [name, setName] = useState('');
  const subjects = useLiveQuery(() => db.subjects.orderBy('createdAt').reverse().toArray(), []);
  const counts = useLiveQuery(async () => {
    const chapters = await db.chapters.toArray();
    const items = await db.items.toArray();
    const map: Record<string, { c: number; i: number }> = {};
    for (const ch of chapters) {
      map[ch.subjectId] ??= { c: 0, i: 0 };
      map[ch.subjectId].c++;
    }
    for (const it of items) {
      map[it.subjectId] ??= { c: 0, i: 0 };
      map[it.subjectId].i++;
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
          <img src="/penguin-pink.svg" alt="" className="w-24 h-24 mx-auto mb-4 opacity-80" />
          <p>Nessuna materia ancora. Aggiungi la prima qui sopra! 🐧</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((s) => (
          <Link
            key={s.id}
            to={`/subject/${s.id}`}
            className="group relative p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div className="flex items-start gap-3">
              <img
                src={s.color === 'pink' ? '/penguin-pink.svg' : '/penguin-blue.svg'}
                alt=""
                className="w-12 h-12 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">{s.name}</h3>
                <p className="text-xs text-ink/50 mt-1">
                  {counts?.[s.id]?.c ?? 0} capitoli · {counts?.[s.id]?.i ?? 0} elementi
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}