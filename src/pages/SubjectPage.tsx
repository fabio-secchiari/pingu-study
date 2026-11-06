import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../db';
import ItemModal from '../components/ItemModal';
import {
  STATUS_DOT,
  STATUS_LABELS,
  STATUS_VALUES,
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_VALUES,
  uid,
  type Chapter,
  type Item,
  type ItemType,
  type StudyStatus,
} from '../types';
import { importFromLLM } from '../lib/backup';
import { parseJsonLoose } from '../lib/schema';
import MathText from '../components/MathText';
import Markdown from '../components/Markdown';
import { compareTitles, daysUntil, matches } from '../lib/text';
import { statusOf } from '../lib/srs';
import { realmPatch } from '../lib/cloud';
import { celebrate } from '../components/Celebration';
import Penguin from '../components/Penguin';

type SortMode = 'manuale' | 'az' | 'za' | 'recenti' | 'vecchi';
const SORT_LABELS: Record<SortMode, string> = {
  manuale: 'Ordine manuale',
  az: 'Alfabetico A → Z',
  za: 'Alfabetico Z → A',
  recenti: 'Più recenti',
  vecchi: 'Meno recenti',
};

const itemOrder = (i: Item) => i.order ?? i.createdAt;

function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV] as const;
}

function ProgressBar({ items, className = '' }: { items: Item[]; className?: string }) {
  const total = items.length || 1;
  const mastered = items.filter((i) => statusOf(i) === 'padroneggiato').length;
  const reviewed = items.filter((i) => statusOf(i) === 'ripassato').length;
  return (
    <div
      className={`h-2 rounded-full bg-ink/5 overflow-hidden flex ${className}`}
      title={`${mastered} padroneggiati · ${reviewed} ripassati · ${items.length - mastered - reviewed} da studiare`}
    >
      <div className="bg-emerald-400" style={{ width: `${(mastered / total) * 100}%` }} />
      <div className="bg-amber-300" style={{ width: `${(reviewed / total) * 100}%` }} />
    </div>
  );
}

function ItemCard({ item, onOpen, sortable }: { item: Item; onOpen: () => void; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={isDragging ? 'opacity-80' : ''}
    >
      <button
        {...(sortable ? attributes : {})}
        {...(sortable ? listeners : {})}
        onClick={onOpen}
        className={`w-full text-left p-3 rounded-2xl bg-white border border-penguin-blue-soft hover:shadow-sm transition ${
          sortable ? 'touch-manipulation cursor-grab active:cursor-grabbing' : ''
        } ${isDragging ? 'shadow-lg ring-2 ring-penguin-blue' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[statusOf(item)]}`}
            title={STATUS_LABELS[statusOf(item)]}
          />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.type]}`}>
            {TYPE_LABELS[item.type]}
          </span>
          {item.needsProof && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              dimostrazione
            </span>
          )}
        </div>
        <MathText as="p" className="font-medium truncate">
          {item.title}
        </MathText>
        {item.description && (
          <div className="text-xs text-ink/60 line-clamp-2 mt-0.5 max-h-10 overflow-hidden">
            <Markdown>{item.description}</Markdown>
          </div>
        )}
      </button>
    </li>
  );
}

function ChapterSection({
  chapter,
  items,
  sortable,
  onOpen,
  onAdd,
  onDelete,
  onRename,
  onReorder,
}: {
  chapter: Chapter;
  items: Item[];
  sortable: boolean;
  onOpen: (it: Item) => void;
  onAdd: () => void;
  onDelete: () => void;
  onRename: (t: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sort = useSortable({ id: 'ch-' + chapter.id, disabled: !sortable });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };

  return (
    <section
      ref={sort.setNodeRef}
      style={{ transform: CSS.Transform.toString(sort.transform), transition: sort.transition }}
      className="rounded-3xl bg-white/85 border border-penguin-blue-soft p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 mb-2">
        {sortable && (
          <button
            {...sort.attributes}
            {...sort.listeners}
            className="text-ink/30 hover:text-ink/60 cursor-grab touch-none px-1"
            aria-label={`Sposta il capitolo ${chapter.title}`}
            title="Trascina per riordinare"
          >
            ⋮⋮
          </button>
        )}
        <h3
          className="font-semibold text-lg flex-1 truncate"
          onDoubleClick={() => {
            const t = prompt('Nuovo nome del capitolo', chapter.title);
            if (t?.trim()) onRename(t.trim());
          }}
          title="Doppio click per rinominare"
        >
          {chapter.title}
        </h3>
        <span className="text-xs text-ink/40 tabular-nums">{items.length}</span>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-xl bg-penguin-blue text-white text-sm hover:bg-penguin-blue-dark"
        >
          + Elemento
        </button>
        <button onClick={onDelete} className="text-ink/40 hover:text-red-600 px-2" title="Elimina capitolo" aria-label="Elimina capitolo">
          ×
        </button>
      </div>
      {items.length > 0 && <ProgressBar items={items} className="mb-3" />}

      {items.length === 0 ? (
        <p className="text-sm text-ink/40 py-2">Nessun elemento.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <ItemCard key={it.id} item={it} sortable={sortable} onOpen={() => onOpen(it)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

export default function SubjectPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [newChapter, setNewChapter] = useState('');
  const [modal, setModal] = useState<{ chapterId: string; item: Item | null } | null>(null);
  const [filter, setFilter] = useState<ItemType | 'tutti'>('tutti');
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'tutti'>('tutti');
  const [proofOnly, setProofOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = usePersisted<SortMode>(`penguin-sort-${id}`, 'manuale');
  const [editExam, setEditExam] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const chapters = useLiveQuery(() => db.chapters.where('subjectId').equals(id).sortBy('order'), [id]);
  const items = useLiveQuery(() => db.items.where('subjectId').equals(id).toArray(), [id]);

  // Apertura diretta di un elemento (da ricerca globale o da un [[collegamento]])
  const openParam = params.get('item');
  useEffect(() => {
    if (!openParam || !items) return;
    const it = items.find((i) => i.id === openParam);
    if (it) setModal({ chapterId: it.chapterId, item: it });
    setParams({}, { replace: true });
  }, [openParam, items, setParams]);

  const filtering = !!query.trim() || filter !== 'tutti' || statusFilter !== 'tutti' || proofOnly;
  const sortable = sort === 'manuale' && !filtering;

  const visible = useMemo(() => {
    const list = (items ?? []).filter(
      (i) =>
        (filter === 'tutti' || i.type === filter) &&
        (statusFilter === 'tutti' || statusOf(i) === statusFilter) &&
        (!proofOnly || i.needsProof) &&
        matches(query, i.title, i.description, i.proofText)
    );
    const cmp: Record<SortMode, (a: Item, b: Item) => number> = {
      manuale: (a, b) => itemOrder(a) - itemOrder(b),
      az: (a, b) => compareTitles(a.title, b.title),
      za: (a, b) => compareTitles(b.title, a.title),
      recenti: (a, b) => b.createdAt - a.createdAt,
      vecchi: (a, b) => a.createdAt - b.createdAt,
    };
    return list.sort(cmp[sort]);
  }, [items, filter, statusFilter, proofOnly, query, sort]);

  const chapterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!subject) return <p className="text-ink/60">Caricamento…</p>;

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapter.trim()) return;
    const maxOrder = Math.max(0, ...(chapters ?? []).map((c) => c.order));
    await db.chapters.add({
      id: uid(),
      subjectId: id,
      title: newChapter.trim(),
      order: maxOrder + 1,
      ...realmPatch(subject.realmId),
    });
    setNewChapter('');
  };

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Eliminare il capitolo e tutti i suoi elementi?')) return;
    const ids = await db.items.where('chapterId').equals(chapterId).primaryKeys();
    await db.proofImages.where('itemId').anyOf(ids).delete();
    await db.items.where('chapterId').equals(chapterId).delete();
    await db.chapters.delete(chapterId);
  };

  const deleteSubject = async () => {
    if (!confirm(`Eliminare "${subject.name}" e tutto il suo contenuto?`)) return;
    const ids = await db.items.where('subjectId').equals(id).primaryKeys();
    await db.proofImages.where('itemId').anyOf(ids).delete();
    await db.items.where('subjectId').equals(id).delete();
    await db.chapters.where('subjectId').equals(id).delete();
    await db.subjects.delete(id);
    nav('/');
  };

  const handleImport = async (file: File) => {
    try {
      const raw = parseJsonLoose(await file.text());
      await importFromLLM(raw);
      alert('Import completato.');
    } catch (e: any) {
      alert('Errore di import: ' + (e?.message ?? e));
    }
  };

  const reorderItems = async (ids: string[]) => {
    await db.transaction('rw', db.items, async () => {
      for (let i = 0; i < ids.length; i++) await db.items.update(ids[i], { order: i + 1 });
    });
  };

  const onChapterDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id || !chapters) return;
    const ids = chapters.map((c) => 'ch-' + c.id);
    const moved = arrayMove(chapters, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    await db.transaction('rw', db.chapters, async () => {
      for (let i = 0; i < moved.length; i++) await db.chapters.update(moved[i].id, { order: i + 1 });
    });
  };

  const markPassed = async () => {
    const grade = prompt('Com\'è andata? Scrivi il voto (facoltativo) 🐧', '') ?? '';
    await db.subjects.update(id, { examPassed: true, examGrade: grade.trim() || undefined });
    celebrate(`${subject.name} superato! ${grade ? grade + ' ' : ''}🎉🐧`);
  };

  const examDays = subject.examDate ? daysUntil(subject.examDate) : null;
  const visibleChapters = (chapters ?? []).filter(
    (ch) => !filtering || visible.some((i) => i.chapterId === ch.id)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => nav('/')} className="text-ink/60 hover:text-ink text-2xl leading-none" aria-label="Indietro">
          ←
        </button>
        <button
          onClick={() => db.subjects.update(id, { color: subject.color === 'pink' ? 'blue' : 'pink' })}
          className="relative shrink-0 rounded-2xl hover:bg-white/60 active:scale-95 transition p-0.5"
          title={`Pinguino ${subject.color === 'pink' ? 'rosa' : 'blu'}: tocca per farlo ${subject.color === 'pink' ? 'blu' : 'rosa'}`}
          aria-label={`Cambia colore della materia in ${subject.color === 'pink' ? 'blu' : 'rosa'}`}
        >
          <Penguin color={subject.color === 'pink' ? 'pink' : 'blue'} className="w-12 h-12" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
              subject.color === 'pink' ? 'bg-penguin-blue' : 'bg-penguin-pink'
            }`}
            aria-hidden
          />
        </button>
        <div className="flex-1 min-w-0 basis-48">
          <h2 className="text-2xl font-bold truncate">{subject.name}</h2>
          <button
            onClick={() => setEditExam((v) => !v)}
            className="text-xs text-ink/60 hover:text-ink"
          >
            {subject.examPassed
              ? `✅ Esame superato${subject.examGrade ? ` · ${subject.examGrade}` : ''}`
              : examDays === null
                ? '📅 Imposta la data d\'esame'
                : examDays > 0
                  ? `📅 Esame tra ${examDays} ${examDays === 1 ? 'giorno' : 'giorni'}`
                  : examDays === 0
                    ? '📅 Esame oggi!'
                    : '📅 Esame passato: com\'è andata?'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/ripasso/${id}`}
            className="px-3 py-2 rounded-xl bg-penguin-pink text-white text-sm font-medium hover:bg-penguin-pink-dark"
          >
            🃏 Ripasso
          </Link>
          <Link
            to={`/stampa/${id}`}
            className="px-3 py-2 rounded-xl bg-white/80 border border-penguin-blue-soft text-sm hover:bg-penguin-blue-soft"
            title="Versione stampabile / PDF"
          >
            🖨️ PDF
          </Link>
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
          <button onClick={deleteSubject} className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm">
            Elimina
          </button>
        </div>
      </div>

      {editExam && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white/85 border border-penguin-blue-soft">
          <label className="text-sm">
            Data d'esame{' '}
            <input
              type="date"
              value={subject.examDate ?? ''}
              onChange={(e) => db.subjects.update(id, { examDate: e.target.value || undefined, examPassed: false })}
              className="ml-2 px-3 py-2 rounded-xl border border-penguin-blue-soft"
            />
          </label>
          {subject.examDate && !subject.examPassed && (
            <button onClick={markPassed} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm">
              Passato! 🎉
            </button>
          )}
          {subject.examPassed && (
            <button
              onClick={() => db.subjects.update(id, { examPassed: false, examGrade: undefined })}
              className="px-3 py-2 rounded-xl text-sm text-ink/60 hover:bg-ink/5"
            >
              Annulla "superato"
            </button>
          )}
        </div>
      )}

      {examDays === 0 && !subject.examPassed && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-3xl bg-penguin-pink-soft border border-penguin-pink">
          <Penguin color="pink" accessory="fiocco" className="w-14 h-14 anim-wobble" />
          <div className="flex-1 min-w-48">
            <p className="font-bold">Oggi è il grande giorno! In bocca al pinguino 🐧💪</p>
            <p className="text-sm text-ink/60">Respira, hai studiato tantissimo. Quando hai finito, dimmi com'è andata.</p>
          </div>
          <button onClick={markPassed} className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-medium">
            Passato! 🎉
          </button>
        </div>
      )}

      {(items?.length ?? 0) > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar items={items ?? []} className="flex-1" />
          <span className="text-xs text-ink/50 tabular-nums">
            {(items ?? []).filter((i) => statusOf(i) === 'padroneggiato').length}/{items?.length} padroneggiati
          </span>
        </div>
      )}

      {/* Ricerca e ordinamento */}
      <div className="space-y-3 p-3 sm:p-4 rounded-3xl bg-white/70 border border-penguin-blue-soft">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca in titoli, enunciati e dimostrazioni…"
              aria-label="Cerca"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Ordina"
            className="px-3 py-2.5 rounded-2xl bg-white border border-penguin-blue-soft text-sm"
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('tutti')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === 'tutti' ? 'bg-ink text-white border-ink' : 'bg-white/70 border-penguin-blue-soft text-ink/70'
            }`}
          >
            Tutti
          </button>
          {TYPE_VALUES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? 'tutti' : t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                filter === t ? TYPE_COLORS[t] : 'bg-white/70 border-penguin-blue-soft text-ink/70'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
          <span className="w-px bg-ink/10 mx-1" />
          {STATUS_VALUES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'tutti' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                statusFilter === s ? 'bg-ink text-white border-ink' : 'bg-white/70 border-penguin-blue-soft text-ink/70'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABELS[s]}
            </button>
          ))}
          <button
            onClick={() => setProofOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              proofOnly ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white/70 border-penguin-blue-soft text-ink/70'
            }`}
          >
            Solo con dimostrazione
          </button>
        </div>
        {filtering && (
          <p className="text-xs text-ink/50">
            {visible.length} {visible.length === 1 ? 'risultato' : 'risultati'}
            {sort === 'manuale' && ' · il trascinamento è disattivato mentre filtri'}
          </p>
        )}
        {sortable && (items?.length ?? 0) > 1 && (
          <p className="text-xs text-ink/40">Suggerimento: trascina le schede (tieni premuto su iPad) per riordinarle.</p>
        )}
      </div>

      <form onSubmit={addChapter} className="flex gap-2">
        <input
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="Nuovo capitolo…"
          aria-label="Nuovo capitolo"
          className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue"
        />
        <button className="px-5 py-3 rounded-2xl bg-penguin-pink text-white font-medium hover:bg-penguin-pink-dark">
          Aggiungi
        </button>
      </form>

      {chapters?.length === 0 && <p className="text-center text-ink/50 py-8">Aggiungi il primo capitolo 👆</p>}
      {filtering && visibleChapters.length === 0 && (
        <p className="text-center text-ink/50 py-8">Nessun elemento corrisponde alla ricerca 🐧</p>
      )}

      <DndContext sensors={chapterSensors} collisionDetection={closestCenter} onDragEnd={onChapterDragEnd}>
        <SortableContext items={visibleChapters.map((c) => 'ch-' + c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-5">
            {visibleChapters.map((ch) => (
              <ChapterSection
                key={ch.id}
                chapter={ch}
                items={visible.filter((i) => i.chapterId === ch.id)}
                sortable={sortable}
                onOpen={(it) => setModal({ chapterId: ch.id, item: it })}
                onAdd={() => setModal({ chapterId: ch.id, item: null })}
                onDelete={() => deleteChapter(ch.id)}
                onRename={(title) => db.chapters.update(ch.id, { title })}
                onReorder={reorderItems}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modal && (
        <ItemModal
          subjectId={id}
          subjectRealmId={subject.realmId}
          chapterId={modal.chapterId}
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
