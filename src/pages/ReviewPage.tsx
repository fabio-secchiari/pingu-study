import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  STATUS_DOT,
  STATUS_LABELS,
  STATUS_VALUES,
  TYPE_COLORS,
  TYPE_LABELS,
  uid,
  type Item,
  type StudyStatus,
} from '../types';
import Markdown from '../components/Markdown';
import MathText from '../components/MathText';
import Penguin from '../components/Penguin';
import { isDue, review, statusOf, type Grade } from '../lib/srs';
import { realmPatch, useMyUserId } from '../lib/cloud';
import { useMaterieActive } from '../lib/sections';

/** Cosa ripassare: per colore (predefinito) oppure le carte che la ripetizione spaziata propone oggi. */
type Mode = 'colori' | 'oggi';
type Order = 'casuale' | 'capitoli';

interface Settings {
  mode: Mode;
  colors: StudyStatus[];
  /** Capitoli scelti; vuoto = tutti */
  chapters: string[];
  proofOnly: boolean;
  order: Order;
}

const DEFAULTS: Settings = { mode: 'colori', colors: ['da-studiare', 'ripassato'], chapters: [], proofOnly: false, order: 'casuale' };

const GRADE_TO_STATUS: Record<Grade, StudyStatus> = { ancora: 'da-studiare', difficile: 'ripassato', so: 'padroneggiato' };

const COLOR_CHIP: Record<StudyStatus, { on: string; emoji: string }> = {
  'da-studiare': { on: 'bg-rose-100 border-rose-300 text-rose-800', emoji: '🔴' },
  ripassato: { on: 'bg-amber-100 border-amber-300 text-amber-800', emoji: '🟡' },
  padroneggiato: { on: 'bg-emerald-100 border-emerald-300 text-emerald-800', emoji: '🟢' },
};

function useReviewSettings(subjectId: string) {
  const key = `penguin-review-${subjectId}`;
  const [s, setS] = useState<Settings>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(key) ?? '{}') };
    } catch {
      return DEFAULTS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [key, s]);
  return [s, setS] as const;
}

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

const chip = (on: boolean, onCls: string) =>
  `px-3 py-2 rounded-2xl border text-sm font-medium transition ${on ? onCls : 'bg-white border-penguin-blue-soft text-ink/60'}`;

interface Session {
  queue: string[];
  /** Colore di ogni carta all'inizio della sessione */
  before: Record<string, StudyStatus>;
  /** Ultima risposta data a ogni carta */
  answers: Record<string, Grade>;
  /** Carte "Non la so" già rimesse in coda una volta */
  requeued: string[];
  done: number;
  startedAt: number;
}

export default function ReviewPage() {
  const { id = '' } = useParams();
  const me = useMyUserId();
  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const chapters = useLiveQuery(() => db.chapters.where('subjectId').equals(id).sortBy('order'), [id]);
  const all = useLiveQuery(() => db.items.where('subjectId').equals(id).toArray(), [id]);

  const [settings, setSettings] = useReviewSettings(id);
  const [session, setSession] = useState<Session | null>(null);
  const [revealed, setRevealed] = useState(false);
  const logged = useRef(false);
  // Quando sei su un'altra scheda il ripasso resta in pausa (e i tasti 1/2/3/spazio non lo toccano)
  const active = useMaterieActive();

  /** Carte che rispettano capitoli e "solo dimostrazioni" (prima del filtro per colore). */
  const base = useMemo(
    () =>
      (all ?? []).filter(
        (i) => (settings.chapters.length === 0 || settings.chapters.includes(i.chapterId)) && (!settings.proofOnly || i.needsProof)
      ),
    [all, settings.chapters, settings.proofOnly]
  );

  const countByColor = useMemo(() => {
    const c: Record<StudyStatus, number> = { 'da-studiare': 0, ripassato: 0, padroneggiato: 0 };
    for (const i of base) c[statusOf(i)]++;
    return c;
  }, [base]);

  const pool = useMemo(() => {
    const now = Date.now();
    return base.filter((i) => (settings.mode === 'oggi' ? isDue(i, now) : settings.colors.includes(statusOf(i))));
  }, [base, settings.mode, settings.colors]);

  const chapterOrder = useMemo(() => new Map((chapters ?? []).map((c, n) => [c.id, n])), [chapters]);

  const begin = (items: Item[]) => {
    const ordered =
      settings.order === 'capitoli'
        ? [...items].sort(
            (a, b) =>
              (chapterOrder.get(a.chapterId) ?? 0) - (chapterOrder.get(b.chapterId) ?? 0) ||
              (a.order ?? a.createdAt) - (b.order ?? b.createdAt)
          )
        : items
            .map((i) => ({ i, k: Math.random() }))
            .sort((a, b) => a.k - b.k)
            .map((x) => x.i);
    logged.current = false;
    setRevealed(false);
    setSession({
      queue: ordered.map((i) => i.id),
      before: Object.fromEntries(items.map((i) => [i.id, statusOf(i)])),
      answers: {},
      requeued: [],
      done: 0,
      startedAt: Date.now(),
    });
  };

  const current: Item | undefined = useMemo(
    () => (session?.queue.length ? all?.find((i) => i.id === session.queue[0]) : undefined),
    [session, all]
  );

  const grade = async (g: Grade) => {
    if (!current || !session) return;
    await db.items.update(current.id, review(current, g));
    let rest = session.queue.slice(1);
    let requeued = session.requeued;
    // "Non la so" torna una volta in fondo alla sessione, per riprovarla subito
    if (g === 'ancora' && !requeued.includes(current.id)) {
      rest = [...rest, current.id];
      requeued = [...requeued, current.id];
    }
    setSession({ ...session, queue: rest, requeued, answers: { ...session.answers, [current.id]: g }, done: session.done + 1 });
    setRevealed(false);
  };

  // Fine sessione: registra il ripasso (vale per la serie di giorni, non per il monte ore)
  const finished = !!session && session.queue.length === 0;
  useEffect(() => {
    if (!finished || !session || logged.current || session.done === 0) return;
    logged.current = true;
    db.sessions.add({
      id: uid(),
      userId: me,
      kind: 'ripasso',
      subjectId: id,
      minutes: Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)),
      endedAt: Date.now(),
      ...realmPatch(subject?.realmId),
    });
  }, [finished, session, me, id, subject?.realmId]);

  // Scorciatoie: spazio = gira, 1/2/3 = valuta
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

  const toggleColor = (c: StudyStatus) =>
    setSettings((s) => ({
      ...s,
      mode: 'colori',
      colors: s.colors.includes(c) ? s.colors.filter((x) => x !== c) : [...s.colors, c],
    }));
  const toggleChapter = (cid: string) =>
    setSettings((s) => ({
      ...s,
      chapters: s.chapters.includes(cid) ? s.chapters.filter((x) => x !== cid) : [...s.chapters, cid],
    }));

  // Riepilogo
  const summary = (() => {
    if (!session) return null;
    const ids = Object.keys(session.answers);
    const after: Record<StudyStatus, number> = { 'da-studiare': 0, ripassato: 0, padroneggiato: 0 };
    let newGreen = 0;
    for (const cid of ids) {
      const st = GRADE_TO_STATUS[session.answers[cid]];
      after[st]++;
      if (st === 'padroneggiato' && session.before[cid] !== 'padroneggiato') newGreen++;
    }
    const reds = ids.filter((cid) => session.answers[cid] === 'ancora');
    return { total: ids.length, after, newGreen, reds };
  })();

  const remaining = session?.queue.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/subject/${id}`} className="text-ink/60 hover:text-ink text-2xl leading-none" aria-label="Indietro">
          ←
        </Link>
        <h2 className="text-2xl font-bold flex-1 truncate">Ripasso · {subject.name}</h2>
      </div>

      {/* ---------- Impostazioni ---------- */}
      {!session && (
        <div className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-5">
          <div className="flex items-center gap-4">
            <Penguin color="pink" accessory="occhiali" className="w-14 h-14 shrink-0" />
            <p className="text-sm text-ink/70">
              Leggi il titolo, prova a ricordare, gira la carta e dimmi com'è andata: la tua risposta decide il colore
              della carta.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Cosa vuoi ripassare?</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_VALUES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  aria-pressed={settings.mode === 'colori' && settings.colors.includes(c)}
                  className={chip(settings.mode === 'colori' && settings.colors.includes(c), COLOR_CHIP[c].on)}
                >
                  {COLOR_CHIP[c].emoji} {STATUS_LABELS[c]} · <span className="tabular-nums">{countByColor[c]}</span>
                </button>
              ))}
              <button
                onClick={() => setSettings((s) => ({ ...s, mode: s.mode === 'oggi' ? 'colori' : 'oggi' }))}
                aria-pressed={settings.mode === 'oggi'}
                className={chip(settings.mode === 'oggi', 'bg-penguin-blue-soft border-penguin-blue text-penguin-blue-dark')}
                title="Le carte che la ripetizione spaziata propone per oggi, di qualsiasi colore"
              >
                📅 Da ripassare oggi
              </button>
            </div>
            {settings.mode === 'oggi' && (
              <p className="text-xs text-ink/50">
                Il pinguino sceglie per te: le carte mai ripassate e quelle che, in base alle risposte passate, è ora di
                rivedere.
              </p>
            )}
          </div>

          {(chapters?.length ?? 0) > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Capitoli</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSettings((s) => ({ ...s, chapters: [] }))}
                  className={chip(settings.chapters.length === 0, 'bg-ink text-white border-ink')}
                >
                  Tutti
                </button>
                {chapters!.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleChapter(c.id)}
                    className={chip(settings.chapters.includes(c.id), 'bg-penguin-blue-soft border-penguin-blue text-penguin-blue-dark')}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.proofOnly}
                onChange={(e) => setSettings((s) => ({ ...s, proofOnly: e.target.checked }))}
                className="w-4 h-4 accent-penguin-pink-dark"
              />
              Solo con dimostrazione
            </label>
            <span className="flex items-center gap-2">
              Ordine:
              {(['casuale', 'capitoli'] as Order[]).map((o) => (
                <label key={o} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="order"
                    checked={settings.order === o}
                    onChange={() => setSettings((s) => ({ ...s, order: o }))}
                    className="accent-penguin-blue-dark"
                  />
                  {o === 'casuale' ? 'casuale' : 'come nei capitoli'}
                </label>
              ))}
            </span>
          </div>

          <button
            onClick={() => begin(pool)}
            disabled={pool.length === 0}
            className="w-full py-3 rounded-2xl bg-penguin-blue text-white font-semibold hover:bg-penguin-blue-dark disabled:opacity-40"
          >
            {pool.length === 0
              ? 'Nessuna carta con questa scelta'
              : `Inizia · ${pool.length} ${pool.length === 1 ? 'carta' : 'carte'}`}
          </button>
        </div>
      )}

      {/* ---------- Riepilogo ---------- */}
      {session && finished && summary && (
        <div className="p-6 rounded-3xl bg-white/85 border border-penguin-blue-soft text-center space-y-4">
          <Penguin color="blue" mood="love" className="w-20 h-24 mx-auto anim-wobble" />
          <p className="text-lg font-semibold">
            Hai ripassato {summary.total} {summary.total === 1 ? 'carta' : 'carte'} 🐟
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {STATUS_VALUES.slice()
              .reverse()
              .map((c) => (
                <span key={c} className={`px-3 py-1.5 rounded-2xl border text-sm font-medium ${COLOR_CHIP[c].on}`}>
                  {COLOR_CHIP[c].emoji} {summary.after[c]}
                  {c === 'padroneggiato' && summary.newGreen > 0 && <span className="ml-1">(+{summary.newGreen} {summary.newGreen === 1 ? 'nuova' : 'nuove'})</span>}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {summary.reds.length > 0 && (
              <button
                onClick={() => begin(all.filter((i) => summary.reds.includes(i.id)))}
                className="px-4 py-2.5 rounded-2xl bg-rose-100 text-rose-800 font-medium hover:bg-rose-200"
              >
                {summary.reds.length === 1 ? 'Ripassa subito la rossa' : `Ripassa subito le ${summary.reds.length} rosse`}
              </button>
            )}
            <button onClick={() => setSession(null)} className="px-4 py-2.5 rounded-2xl bg-penguin-blue-soft hover:bg-penguin-blue/30 font-medium">
              Nuovo ripasso
            </button>
            <Link to={`/subject/${id}`} className="px-4 py-2.5 rounded-2xl text-ink/70 hover:bg-ink/5">
              Torna alla materia
            </Link>
          </div>
        </div>
      )}

      {/* ---------- Carta ---------- */}
      {current && session && (
        <>
          <div className="flex items-center gap-3 text-xs text-ink/50">
            <span>{session.done} fatte</span>
            <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
              <div className="h-full bg-penguin-pink" style={{ width: `${(session.done / (session.done + remaining)) * 100}%` }} />
            </div>
            <span>{remaining} rimaste</span>
            <button onClick={() => setSession({ ...session, queue: [] })} className="underline hover:text-ink/80">
              Termina
            </button>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-penguin-blue-soft shadow-sm space-y-4 min-h-64">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${COLOR_CHIP[statusOf(current)].on}`}>
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[statusOf(current)]}`} />
                {STATUS_LABELS[statusOf(current)]}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[current.type]}`}>
                {TYPE_LABELS[current.type]}
              </span>
              {current.needsProof && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  con dimostrazione
                </span>
              )}
              {session.requeued.includes(current.id) && session.answers[current.id] === 'ancora' && (
                <span className="text-xs text-ink/50">seconda volta</span>
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
              <button onClick={() => grade('ancora')} className="py-3 rounded-2xl bg-rose-100 text-rose-800 font-medium hover:bg-rose-200">
                🔴 Non la so <span className="block text-[11px] opacity-60">1</span>
              </button>
              <button onClick={() => grade('difficile')} className="py-3 rounded-2xl bg-amber-100 text-amber-800 font-medium hover:bg-amber-200">
                🟡 Così così <span className="block text-[11px] opacity-60">2</span>
              </button>
              <button onClick={() => grade('so')} className="py-3 rounded-2xl bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200">
                🟢 La so! <span className="block text-[11px] opacity-60">3</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
