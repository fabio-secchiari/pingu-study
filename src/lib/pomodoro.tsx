import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { uid } from '../types';
import { realmPatch, useMyUserId, useProfiles } from './cloud';
import { notify, requestNotifications } from './notify';

/**
 * Timer del pomodoro globale: vive sopra le pagine, così continua a girare mentre si
 * leggono definizioni o flashcard. Lo stato è salvato in localStorage (basato su un
 * orario di fine), quindi sopravvive anche a una ricarica della pagina.
 */

export type Mode = 'work' | 'break';

interface Persisted {
  mode: Mode;
  running: boolean;
  /** Orario di fine (ms) quando running */
  endAt: number | null;
  /** Secondi rimasti quando in pausa */
  remaining: number;
  work: number;
  brk: number;
  subjectId: string;
}

const KEY = 'penguin-pomodoro-state';
const OLD_CFG = 'penguin-pomodoro';
const OLD_SUBJ = 'penguin-pomodoro-subject';
const DONE_KEY = 'penguin-pomodoro-last-done';

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const old = JSON.parse(localStorage.getItem(OLD_CFG) ?? '{}');
    const work = old.work ?? 25;
    return {
      mode: 'work',
      running: false,
      endAt: null,
      remaining: work * 60,
      work,
      brk: old.brk ?? 5,
      subjectId: localStorage.getItem(OLD_SUBJ) ?? '',
    };
  } catch {
    return { mode: 'work', running: false, endAt: null, remaining: 25 * 60, work: 25, brk: 5, subjectId: '' };
  }
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.start();
    o.stop(ctx.currentTime + 1.2);
  } catch {
    /* audio non disponibile */
  }
}

export interface PomodoroApi {
  mode: Mode;
  running: boolean;
  remaining: number;
  total: number;
  /** true se c'è una sessione iniziata (in corso o in pausa a metà) */
  active: boolean;
  work: number;
  brk: number;
  subjectId: string;
  subjectName?: string;
  fishPop: number;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  switchTo: (m: Mode) => void;
  setWork: (min: number) => void;
  setBrk: (min: number) => void;
  setSubjectId: (id: string) => void;
}

const Ctx = createContext<PomodoroApi | null>(null);

export function usePomodoro(): PomodoroApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePomodoro fuori da PomodoroProvider');
  return v;
}

export function fmtClock(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<Persisted>(load);
  const [now, setNow] = useState(Date.now());
  const [fishPop, setFishPop] = useState(0);
  const me = useMyUserId();
  const { mine } = useProfiles();
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const stRef = useRef(st);
  stRef.current = st;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* ignore */
    }
  }, [st]);

  // Sincronizza tra più schede aperte
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setSt(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const total = (st.mode === 'work' ? st.work : st.brk) * 60;
  const remaining = st.running && st.endAt ? Math.max(0, Math.round((st.endAt - now) / 1000)) : st.remaining;

  /** Fa sapere all'altra persona che stai studiando (per lo "studiamo insieme"). */
  const setPresence = useCallback(
    (until: number | undefined, subjectId?: string) => {
      if (!mine) return;
      if (!until && !mine.studyingUntil) return;
      db.profiles.update(mine.id, { studyingUntil: until, studyingSubject: until ? subjectId || undefined : undefined });
    },
    [mine]
  );

  const complete = useCallback(
    async (endAt: number) => {
      // Una sola volta per pomodoro, anche con più schede aperte
      try {
        if (localStorage.getItem(DONE_KEY) === String(endAt)) return;
        localStorage.setItem(DONE_KEY, String(endAt));
      } catch {
        /* ignore */
      }
      const cur = stRef.current;
      beep();
      if (cur.mode === 'work') {
        notify('Pomodoro completato!', 'Hai guadagnato un pesciolino 🐟 Tempo di pausa 🐧', 'pomodoro');
        const subj = subjects.find((x) => x.id === cur.subjectId);
        await db.sessions.add({
          id: uid(),
          userId: me,
          kind: 'pomodoro',
          subjectId: cur.subjectId || undefined,
          minutes: cur.work,
          endedAt: Math.min(endAt, Date.now()),
          ...realmPatch(subj?.realmId),
        });
        setFishPop((n) => n + 1);
        setPresence(undefined);
        setSt((s) => ({ ...s, mode: 'break', running: false, endAt: null, remaining: s.brk * 60 }));
      } else {
        notify('Pausa finita!', 'Torniamo a studiare 🐧', 'pomodoro');
        setSt((s) => ({ ...s, mode: 'work', running: false, endAt: null, remaining: s.work * 60 }));
      }
    },
    [me, subjects, setPresence]
  );

  // Tick (anche a fine timer avvenuta mentre l'app era chiusa)
  useEffect(() => {
    if (!st.running || !st.endAt) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (st.endAt && t >= st.endAt) complete(st.endAt);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [st.running, st.endAt, complete]);

  // "Sta studiando" deve sempre corrispondere al timer vero di QUESTO dispositivo: se non
  // combacia (pagina chiusa a metà, vecchie versioni) lo correggo. Lo cancello solo se è
  // stato questo dispositivo a impostarlo, per non spegnere un timer avviato su un altro.
  useEffect(() => {
    if (!mine) return;
    const OWNER = 'penguin-presence-owner';
    const studying = st.running && st.mode === 'work' && st.endAt ? st.endAt : undefined;
    let owned = false;
    try {
      // Le versioni precedenti lasciavano lo stato acceso: la prima volta lo considero mio
      owned = localStorage.getItem(OWNER) === '1' || !localStorage.getItem('penguin-presence-v2');
      localStorage.setItem('penguin-presence-v2', '1');
    } catch {
      /* ignore */
    }
    if (studying && mine.studyingUntil !== studying) {
      db.profiles.update(mine.id, { studyingUntil: studying, studyingSubject: st.subjectId || undefined });
    } else if (!studying && mine.studyingUntil && (owned || mine.studyingUntil < Date.now())) {
      db.profiles.update(mine.id, { studyingUntil: undefined, studyingSubject: undefined });
    }
    try {
      if (studying) localStorage.setItem(OWNER, '1');
      else localStorage.removeItem(OWNER);
    } catch {
      /* ignore */
    }
  }, [mine, st.running, st.mode, st.endAt, st.subjectId]);

  // Titolo della scheda col tempo rimasto
  useEffect(() => {
    const base = 'Pingu Study';
    const isActive = st.running || st.remaining < total;
    document.title = isActive ? `${fmtClock(remaining)} · ${st.mode === 'work' ? 'Studio' : 'Pausa'} · ${base}` : base;
  }, [remaining, st.running, st.remaining, st.mode, total]);

  const api = useMemo<PomodoroApi>(() => {
    const toggle = async () => {
      const cur = stRef.current;
      if (cur.running) {
        const left = cur.endAt ? Math.max(0, Math.round((cur.endAt - Date.now()) / 1000)) : cur.remaining;
        setSt({ ...cur, running: false, endAt: null, remaining: left });
        setPresence(undefined);
      } else {
        requestNotifications();
        const endAt = Date.now() + cur.remaining * 1000;
        setNow(Date.now());
        setSt({ ...cur, running: true, endAt });
        if (cur.mode === 'work') setPresence(endAt, cur.subjectId);
      }
    };
    const resetTo = (mode: Mode) =>
      setSt((s) => ({ ...s, mode, running: false, endAt: null, remaining: (mode === 'work' ? s.work : s.brk) * 60 }));
    return {
      mode: st.mode,
      running: st.running,
      remaining,
      total,
      active: st.running || st.remaining < total,
      work: st.work,
      brk: st.brk,
      subjectId: st.subjectId,
      subjectName: subjects.find((x) => x.id === st.subjectId)?.name,
      fishPop,
      toggle,
      reset: () => {
        resetTo(stRef.current.mode);
        setPresence(undefined);
      },
      // Passa alla fase successiva senza contare il pomodoro
      skip: () => {
        resetTo(stRef.current.mode === 'work' ? 'break' : 'work');
        setPresence(undefined);
      },
      switchTo: (m) => {
        resetTo(m);
        setPresence(undefined);
      },
      setWork: (min) =>
        setSt((s) => ({ ...s, work: min, remaining: s.mode === 'work' && !s.running ? min * 60 : s.remaining })),
      setBrk: (min) =>
        setSt((s) => ({ ...s, brk: min, remaining: s.mode === 'break' && !s.running ? min * 60 : s.remaining })),
      setSubjectId: (subjectId) => setSt((s) => ({ ...s, subjectId })),
    };
  }, [st, remaining, total, fishPop, subjects, setPresence]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
