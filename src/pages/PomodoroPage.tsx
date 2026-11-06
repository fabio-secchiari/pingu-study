import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { uid } from '../types';
import Penguin from '../components/Penguin';
import { realmPatch, useIgloo, useMyUserId, useProfiles } from '../lib/cloud';
import { fishOf, minutesBySubject } from '../lib/stats';
import { notify, requestNotifications } from '../lib/notify';
import StudyCalendar from '../components/StudyCalendar';

type Mode = 'work' | 'break';

const LS_KEY = 'penguin-pomodoro';
const SUBJ_KEY = 'penguin-pomodoro-subject';

interface Cfg {
  work: number;
  brk: number;
  sessions: number;
}

const defaults: Cfg = { work: 25, brk: 5, sessions: 0 };

export default function PomodoroPage() {
  const [cfg, setCfg] = useState<Cfg>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') };
    } catch {
      return defaults;
    }
  });
  const [mode, setMode] = useState<Mode>('work');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(cfg.work * 60);
  const endRef = useRef<number | null>(null);
  const me = useMyUserId();
  const { mine, partner } = useProfiles();
  const igloo = useIgloo();
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const [subjectId, setSubjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(SUBJ_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [fishPop, setFishPop] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(SUBJ_KEY, subjectId);
    } catch {
      /* ignore */
    }
  }, [subjectId]);

  /** Fa sapere all'altra persona che stai studiando (per lo "studiamo insieme"). */
  const setPresence = (until: number | undefined) => {
    if (!mine) return;
    db.profiles.update(mine.id, { studyingUntil: until, studyingSubject: until ? subjectId || undefined : undefined });
  };

  const logPomodoro = async () => {
    const subj = subjects.find((x) => x.id === subjectId);
    await db.sessions.add({
      id: uid(),
      userId: me,
      kind: 'pomodoro',
      subjectId: subjectId || undefined,
      minutes: cfg.work,
      endedAt: Date.now(),
      ...realmPatch(subj?.realmId),
    });
    setFishPop((n) => n + 1);
  };
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  }, [cfg]);

  const total = (mode === 'work' ? cfg.work : cfg.brk) * 60;

  const beep = () => {
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
    } catch {}
  };



  const switchMode = () => {
    beep();
    if (mode === 'work') {
      notify('Pomodoro completato!', 'Hai guadagnato un pesciolino 🐟 Tempo di pausa 🐧');
      setCfg((c) => ({ ...c, sessions: c.sessions + 1 }));
      logPomodoro();
      setPresence(undefined);
      setMode('break');
      setRemaining(cfg.brk * 60);
    } else {
      notify('Pausa finita!', 'Torniamo a studiare 🐧');
      setMode('work');
      setRemaining(cfg.work * 60);
    }
    setRunning(false);
    endRef.current = null;
  };

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      if (mine?.studyingUntil) setPresence(undefined);
      return;
    }
    endRef.current = Date.now() + remaining * 1000;
    if (mode === 'work') setPresence(endRef.current);
    tickRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.round(((endRef.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) switchMode();
    }, 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const toggle = async () => {
    if (!running) await requestNotifications();
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    endRef.current = null;
    setRemaining(total);
  };

  const switchTo = (m: Mode) => {
    setMode(m);
    setRunning(false);
    setRemaining((m === 'work' ? cfg.work : cfg.brk) * 60);
  };

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const pct = 1 - remaining / total;
  const myFish = fishOf(sessions, me, igloo);
  const partnerStudying = !!partner?.studyingUntil && partner.studyingUntil > Date.now();
  const together = partnerStudying && running && mode === 'work';
  const weekAgo = Date.now() - 7 * 86400000;
  const weekly = minutesBySubject(sessions.filter((x) => x.userId === me), weekAgo);
  const weeklyRows = Object.entries(weekly)
    .map(([sid, min]) => ({ name: subjects.find((x) => x.id === sid)?.name ?? 'Senza materia', min }))
    .sort((a, b) => b.min - a.min);
  const weeklyMax = Math.max(1, ...weeklyRows.map((r) => r.min));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="relative flex justify-center items-end gap-2">
          <Penguin
            color={mine?.color ?? (mode === 'work' ? 'blue' : 'pink')}
            accessory={mine?.accessory ?? 'none'}
            mood={mode === 'break' ? 'sleepy' : together ? 'love' : 'happy'}
            className="w-24 h-28"
          />
          {partnerStudying && partner && (
            <Penguin color={partner.color} accessory={partner.accessory} mood={together ? 'love' : 'happy'} className="w-20 h-24" />
          )}
          {fishPop > 0 && (
            <span key={fishPop} className="anim-float absolute -top-2 text-3xl" style={{ animation: 'float-up 1.6s ease-out forwards' }}>
              🐟
            </span>
          )}
        </div>
        {partnerStudying && partner && (
          <p className="text-sm font-medium text-penguin-pink-dark">
            {together ? `💞 Tu e ${partner.name} state studiando insieme!` : `${partner.name} sta studiando ora: unisciti!`}
          </p>
        )}
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Materia del pomodoro"
          className="px-4 py-2 rounded-2xl bg-white/80 border border-penguin-blue-soft text-sm"
        >
          <option value="">Senza materia</option>
          {subjects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => switchTo('work')}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              mode === 'work'
                ? 'bg-penguin-blue text-white border-penguin-blue'
                : 'bg-white/70 border-penguin-blue-soft text-ink/70'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => switchTo('break')}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              mode === 'break'
                ? 'bg-penguin-pink text-white border-penguin-pink'
                : 'bg-white/70 border-penguin-blue-soft text-ink/70'
            }`}
          >
            Pausa
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-72 h-72 sm:w-80 sm:h-80">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#E3F0FB" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={mode === 'work' ? '#7BB8E8' : '#EC7FA9'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold tabular-nums">
            {mins}:{secs}
          </div>
          <div className="text-xs text-ink/50 mt-2">
            {mode === 'work' ? 'Studio' : 'Pausa'}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={toggle}
          className="px-8 py-4 rounded-2xl bg-penguin-blue text-white font-semibold text-lg shadow-md hover:bg-penguin-blue-dark min-w-[140px]"
        >
          {running ? 'Pausa' : 'Avvia'}
        </button>
        <button
          onClick={reset}
          className="px-6 py-4 rounded-2xl bg-white/80 border border-penguin-blue-soft font-medium hover:bg-penguin-blue-soft"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <label className="p-3 rounded-2xl bg-white/70 border border-penguin-blue-soft">
          <span className="block text-xs text-ink/50 mb-1">Studio (min)</span>
          <input
            type="number"
            min={1}
            max={90}
            value={cfg.work}
            onChange={(e) => {
              const v = Math.max(1, +e.target.value || 1);
              setCfg({ ...cfg, work: v });
              if (mode === 'work' && !running) setRemaining(v * 60);
            }}
            className="w-full text-center bg-transparent font-semibold focus:outline-none"
          />
        </label>
        <label className="p-3 rounded-2xl bg-white/70 border border-penguin-blue-soft">
          <span className="block text-xs text-ink/50 mb-1">Pausa (min)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={cfg.brk}
            onChange={(e) => {
              const v = Math.max(1, +e.target.value || 1);
              setCfg({ ...cfg, brk: v });
              if (mode === 'break' && !running) setRemaining(v * 60);
            }}
            className="w-full text-center bg-transparent font-semibold focus:outline-none"
          />
        </label>
        <div className="p-3 rounded-2xl bg-white/70 border border-penguin-blue-soft">
          <span className="block text-xs text-ink/50 mb-1">I tuoi pesciolini</span>
          <span className="font-semibold text-lg">🐟 {myFish}</span>
        </div>
      </div>

      {weeklyRows.length > 0 && (
        <section className="p-4 rounded-3xl bg-white/70 border border-penguin-blue-soft space-y-2">
          <h3 className="text-sm font-semibold">Ultimi 7 giorni</h3>
          {weeklyRows.map((r) => (
            <div key={r.name} className="flex items-center gap-3 text-sm">
              <span className="w-32 truncate">{r.name}</span>
              <div className="flex-1 h-2 rounded-full bg-ink/5 overflow-hidden">
                <div className="h-full bg-penguin-blue" style={{ width: `${(r.min / weeklyMax) * 100}%` }} />
              </div>
              <span className="w-16 text-right tabular-nums text-ink/60">
                {r.min >= 60 ? `${Math.floor(r.min / 60)}h ${r.min % 60}m` : `${r.min}m`}
              </span>
            </div>
          ))}
        </section>
      )}

      <StudyCalendar sessions={sessions} subjects={subjects} me={me} mine={mine} partner={partner} />
    </div>
  );
}