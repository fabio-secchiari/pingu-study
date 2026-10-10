import { useEffect, useRef, useState } from 'react';

type Mode = 'work' | 'break';

const LS_KEY = 'penguin-pomodoro';

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

  const notify = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/penguin-blue.svg' });
    }
  };

  const switchMode = () => {
    beep();
    if (mode === 'work') {
      notify('Pomodoro completato!', 'Tempo di pausa 🐧');
      setCfg((c) => ({ ...c, sessions: c.sessions + 1 }));
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
      return;
    }
    endRef.current = Date.now() + remaining * 1000;
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
    if (!running && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
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

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <img
          src={mode === 'work' ? '/penguin-blue.svg' : '/penguin-pink.svg'}
          alt=""
          className="w-28 h-28 mx-auto"
        />
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
          <span className="block text-xs text-ink/50 mb-1">Pomodori fatti</span>
          <span className="font-semibold text-lg">{cfg.sessions}</span>
        </div>
      </div>
    </div>
  );
}