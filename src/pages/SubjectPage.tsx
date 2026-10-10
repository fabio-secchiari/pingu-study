import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import ItemModal from '../components/ItemModal';
import { TYPE_COLORS, TYPE_LABELS, TYPE_VALUES, uid, type Item, type ItemType } from '../types';
import { importFromLLM } from '../lib/backup';

export default function SubjectPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [newChapter, setNewChapter] = useState('');
  const [modal, setModal] = useState<{ chapterId: string; item: Item | null } | null>(null);
  const [filter, setFilter] = useState<ItemType | 'tutti'>('tutti');
  const fileRef = useRef<HTMLInputElement>(null);

  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const chapters = useLiveQuery(
    () => db.chapters.where('subjectId').equals(id).sortBy('order'),
    [id]
  );
  const items = useLiveQuery(() => db.items.where('subjectId').equals(id).toArray(), [id]);

  if (!subject) return <p className="text-ink/60">Caricamento…</p>;

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapter.trim()) return;
    await db.chapters.add({
      id: uid(),
      subjectId: id,
      title: newChapter.trim(),
      order: (chapters?.length ?? 0) + 1,
    });
    setNewChapter('');
  };

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Eliminare il capitolo e tutti i suoi elementi?')) return;
    await db.items.where('chapterId').equals(chapterId).delete();
    await db.chapters.delete(chapterId);
  };

  const deleteSubject = async () => {
    if (!confirm(`Eliminare "${subject.name}" e tutto il suo contenuto?`)) return;
    await db.items.where('subjectId').equals(id).delete();
    await db.chapters.where('subjectId').equals(id).delete();
    await db.subjects.delete(id);
    nav('/');
  };

  const handleImport = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      await importFromLLM(raw);
      alert('Import completato.');
    } catch (e: any) {
      alert('Errore di import: ' + (e?.message ?? e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/')} className="text-ink/60 hover:text-ink text-2xl leading-none">←</button>
        <img
          src={subject.color === 'pink' ? '/penguin-pink.svg' : '/penguin-blue.svg'}
          alt=""
          className="w-12 h-12"
        />
        <h2 className="text-2xl font-bold flex-1 truncate">{subject.name}</h2>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-white/80 border border-penguin-blue-soft text-sm hover:bg-penguin-blue-soft"
          title="Importa JSON (formato LLM)"
        >
          Importa JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
        />
        <button
          onClick={deleteSubject}
          className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm"
        >
          Elimina
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('tutti')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            filter === 'tutti'
              ? 'bg-ink text-white border-ink'
              : 'bg-white/70 border-penguin-blue-soft text-ink/70'
          }`}
        >
          Tutti
        </button>
        {TYPE_VALUES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === t ? TYPE_COLORS[t] : 'bg-white/70 border-penguin-blue-soft text-ink/70'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <form onSubmit={addChapter} className="flex gap-2">
        <input
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="Nuovo capitolo…"
          className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue"
        />
        <button className="px-5 py-3 rounded-2xl bg-penguin-pink text-white font-medium hover:bg-penguin-pink-dark">
          Aggiungi
        </button>
      </form>

      {chapters?.length === 0 && (
        <p className="text-center text-ink/50 py-8">Aggiungi il primo capitolo 👆</p>
      )}

      <div className="space-y-5">
        {chapters?.map((ch) => {
          const chItems = (items ?? [])
            .filter((i) => i.chapterId === ch.id)
            .filter((i) => filter === 'tutti' || i.type === filter);

          return (
            <section key={ch.id} className="rounded-3xl bg-white/85 border border-penguin-blue-soft p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-lg flex-1 truncate">{ch.title}</h3>
                <button
                  onClick={() => setModal({ chapterId: ch.id, item: null })}
                  className="px-3 py-1.5 rounded-xl bg-penguin-blue text-white text-sm hover:bg-penguin-blue-dark"
                >
                  + Elemento
                </button>
                <button
                  onClick={() => deleteChapter(ch.id)}
                  className="text-ink/40 hover:text-red-600 px-2"
                  title="Elimina capitolo"
                >
                  ×
                </button>
              </div>

              {chItems.length === 0 ? (
                <p className="text-sm text-ink/40 py-2">Nessun elemento (ancora).</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {chItems.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => setModal({ chapterId: ch.id, item: it })}
                        className="w-full text-left p-3 rounded-2xl bg-white border border-penguin-blue-soft hover:shadow-sm transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[it.type]}`}>
                            {TYPE_LABELS[it.type]}
                          </span>
                          {it.needsProof && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              dimostrazione
                            </span>
                          )}
                        </div>
                        <p className="font-medium truncate">{it.title}</p>
                        {it.description && (
                          <p className="text-xs text-ink/60 line-clamp-2 mt-0.5">{it.description}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {modal && (
        <ItemModal
          subjectId={id}
          chapterId={modal.chapterId}
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}