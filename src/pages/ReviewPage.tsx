import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TYPE_COLORS, TYPE_LABELS, uid, type Item } from '../types';
import Markdown from '../components/Markdown';
import MathText from '../components/MathText';
import Penguin from '../components/Penguin';
import { isDue, review, type Grade } from '../lib/srs';
import { realmPatch, useMyUserId } from '../lib/cloud';
import { useMaterieActive } from '../lib/sections';

type Scope = 'scadute' | 'tutte' | 'dimostrazioni' | 'deboli';
const SCOPE_LABELS: Record<Scope, string> = {
  scadute: 'Da ripassare oggi',
  deboli: 'Solo i punti deboli',
  dimostrazioni: 'Solo dimostrazioni',
  tutte: 'Tutte',
};

function ProofImages({ itemId }: { itemId: string }) {
  const images = useLiveQuery(() => db.proofImages.where('itemId').equals(itemId).toArray(), [itemId]);
  const urls = useMemo(() => (images ?? []).map((i) => URL.createObjectURL(i.blob)), [images]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);
  if (!urls.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="Foto della dimostrazione" className="rounded-xl border w-full" />
        </a>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { id = '' } = useParams();
  const me = useMyUserId();
  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const chapters = useLiveQuery(() => db.chapters.where('subjectId').equals(id).sortBy('order'), [id]);
  const all = useLiveQuery(() => db.items.where('subjectId').equals(id).toArray(), [id]);

  const [scope, setScope] = useState<Scope>('scadute');
  const [chapterId, setChapterId] = useState<string>('tutti');
  const [queue, setQueue] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const started = useRef(Date.now());
  // Quando sei su un'altra scheda il ripasso resta in pausa (e i tasti 1/2/3/spazio non lo toccano)
  const active = useMaterieActive();

  const start = () => {
    const now = Date.now();
    const pool = (all ?? []).filter(
      (i) =>
        (chapterId === 'tutti' || i.chapterId === chapterId) &&
        (scope === 'tutte' ||
          (scope === 'scadute' && isDue(i, now)) ||
          (scope === 'dimostrazioni' && i.needsProof) ||
          (scope === 'deboli' && (i.status ?? 'da-studiare') !== 'padroneggiato'))
    );
    // Mescola: prima le scadute da più tempo, poi casuale
    const shuffled = pool
      .map((i) => ({ i, k: (i.dueAt ?? 0) + Math.random() * 86400000 }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.i.id);
    setQueue(shuffled);
    setDone(0);
    setRevealed(false);
    started.current = Date.now();
  };

  const current: Item | undefined = useMemo(
    () => (queue?.length ? all?.find((i) => i.id === queue[0]) : undefined),
    [queue, all]
  );

  const grade = async (g: Grade) => {
    if (!current || !queue) return;
    await db.items.update(current.id, review(current, g));
    const rest = queue.slice(1);
    // "Ancora" la rimette in fondo alla coda di oggi
    setQueue(g === 'ancora' ? [...rest, current.id] : rest);
    setRevealed(false);
    setDone((d) => d + 1);
    if (rest.length === 0 && g !== 'ancora') finish();
  };

  const finish = async () => {
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    await db.sessions.add({
      id: uid(),
      userId: me,
      kind: 'ripasso',
      subjectId: id,
      minutes,
      endedAt: Date.now(),
      ...realmPatch(subject?.realmId),
    });
  };

  // Scorciatoie: spazio = mostra, 1/2/3 = valuta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || !active) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === ' ' && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3'].includes(e.key)) {
        grade((['ancora', 'difficile', 'so'] as Grade[])[+e.key - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!subject || !all) return <p className="text-ink/60">Caricamento…</p>;
  const dueCount = all.filter((i) => isDue(i)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/subject/${id}`} className="text-ink/60 hover:text-ink text-2xl leading-none" aria-label="Indietro">
          ←
        </Link>
        <h2 className="text-2xl font-bold flex-1 truncate">Ripasso · {subject.name}</h2>
      </div>

      {queue === null && (
        <div className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-4">
          <div className="flex items-center gap-4">
            <Penguin color="pink" accessory="occhiali" className="w-16 h-16" />
            <p className="text-sm text-ink/70">
              Ti mostro il titolo, tu provi a ricordare l'enunciato (e la dimostrazione), poi giri la carta e mi
              dici com'è andata. Gli elementi che sai bene tornano più di rado.
              <br />
              <b>{dueCount}</b> da ripassare oggi.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Cosa ripassare
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="mt-1 w-full px-3 py-2.5 rounded-2xl border border-penguin-blue-soft bg-white"
              >
                {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Capitolo
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-2xl border border-penguin-blue-soft bg-white"
              >
                <option value="tutti">Tutti i capitoli</option>
                {chapters?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={start}
            className="w-full py-3 rounded-2xl bg-penguin-blue text-white font-semibold hover:bg-penguin-blue-dark"
          >
            Inizia
          </button>
        </div>
      )}

      {queue !== null && !current && (
        <div className="p-8 rounded-3xl bg-white/85 border border-penguin-blue-soft text-center space-y-3">
          <Penguin color="blue" mood="love" className="w-24 h-24 mx-auto anim-wobble" />
          <p className="text-lg font-semibold">
            {done > 0 ? `Fatto! ${done} carte ripassate 🐟` : 'Niente da ripassare con questi filtri 🎉'}
          </p>
          <button onClick={() => setQueue(null)} className="px-4 py-2 rounded-2xl bg-penguin-blue-soft hover:bg-penguin-blue/30">
            Ricomincia
          </button>
        </div>
      )}

      {current && (
        <>
          <div className="flex items-center gap-3 text-xs text-ink/50">
            <span>{done} fatte</span>
            <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
              <div className="h-full bg-penguin-pink" style={{ width: `${(done / (done + queue!.length)) * 100}%` }} />
            </div>
            <span>{queue!.length} rimaste</span>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-penguin-blue-soft shadow-sm space-y-4 min-h-64">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[current.type]}`}>
                {TYPE_LABELS[current.type]}
              </span>
              {current.needsProof && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  con dimostrazione
                </span>
              )}
            </div>
            <MathText as="p" className="text-xl font-bold">
              {current.title}
            </MathText>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-10 rounded-2xl border-2 border-dashed border-penguin-blue-soft text-ink/50 hover:bg-penguin-blue-soft/30"
              >
                Prova a ricordare… poi tocca per girare la carta (spazio)
              </button>
            ) : (
              <div className="space-y-4">
                {current.description && <Markdown>{current.description}</Markdown>}
                {current.needsProof && (
                  <div className="p-4 rounded-2xl bg-penguin-pink-soft/60 border border-penguin-pink/40 space-y-3">
                    <p className="text-sm font-semibold text-penguin-pink-dark">Dimostrazione</p>
                    {current.proofText ? <Markdown>{current.proofText}</Markdown> : null}
                    <ProofImages itemId={current.id} />
                  </div>
                )}
              </div>
            )}
          </div>

          {revealed && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => grade('ancora')} className="py-3 rounded-2xl bg-rose-100 text-rose-800 font-medium">
                Ancora <span className="text-xs opacity-60">1</span>
              </button>
              <button onClick={() => grade('difficile')} className="py-3 rounded-2xl bg-amber-100 text-amber-800 font-medium">
                Difficile <span className="text-xs opacity-60">2</span>
              </button>
              <button onClick={() => grade('so')} className="py-3 rounded-2xl bg-emerald-100 text-emerald-800 font-medium">
                Lo so! <span className="text-xs opacity-60">3</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
