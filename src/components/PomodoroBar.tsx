import { Link, useLocation } from 'react-router-dom';
import { fmtClock, usePomodoro } from '../lib/pomodoro';

/** Mini timer nell'header: resta visibile su tutte le pagine finché c'è un pomodoro in corso. */
export default function PomodoroBar() {
  const p = usePomodoro();
  const { pathname } = useLocation();
  if (!p.active || pathname === '/pomodoro') return null;

  const work = p.mode === 'work';
  const pct = Math.min(100, (1 - p.remaining / p.total) * 100);
  const btn = 'w-9 h-9 rounded-full flex items-center justify-center text-base hover:bg-white/70 active:scale-95 transition';

  return (
    <div className={`border-t ${work ? 'bg-penguin-blue-soft/90 border-penguin-blue/30' : 'bg-penguin-pink-soft/90 border-penguin-pink/40'}`}>
      <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-2 sm:gap-3">
        <span aria-hidden>{work ? '🍅' : '☕'}</span>
        <Link to="/pomodoro" className="flex items-baseline gap-2 min-w-0" title="Apri il pomodoro">
          <span className={`text-lg font-bold tabular-nums ${p.running ? '' : 'opacity-60'}`}>{fmtClock(p.remaining)}</span>
          <span className="text-xs text-ink/60 truncate">
            {work ? 'Studio' : 'Pausa'}
            {p.subjectName && work ? ` · ${p.subjectName}` : ''}
            {!p.running && ' · in pausa'}
          </span>
        </Link>
        <div className="flex-1 h-1.5 rounded-full bg-white/70 overflow-hidden mx-1 hidden sm:block">
          <div className={`h-full ${work ? 'bg-penguin-blue' : 'bg-penguin-pink-dark'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="ml-auto sm:ml-0 flex items-center gap-0.5">
          <button onClick={p.toggle} className={btn} aria-label={p.running ? 'Metti in pausa' : 'Riprendi'} title={p.running ? 'Pausa' : 'Riprendi'}>
            {p.running ? '⏸' : '▶'}
          </button>
          <button onClick={p.skip} className={btn} aria-label={work ? 'Passa alla pausa' : 'Salta la pausa'} title={work ? 'Passa alla pausa (non conta il pomodoro)' : 'Salta la pausa'}>
            ⏭
          </button>
          <button onClick={p.reset} className={btn} aria-label="Ricomincia il timer" title="Reset">
            ↺
          </button>
        </div>
      </div>
      <div className="sm:hidden h-1 bg-white/60">
        <div className={`h-full ${work ? 'bg-penguin-blue' : 'bg-penguin-pink-dark'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Versione compatta per i riquadri a tutto schermo (es. scheda di un elemento). */
export function PomodoroChip() {
  const p = usePomodoro();
  if (!p.active) return null;
  const work = p.mode === 'work';
  return (
    <button
      type="button"
      onClick={p.toggle}
      title={p.running ? 'Metti in pausa il pomodoro' : 'Riprendi il pomodoro'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-semibold tabular-nums ${
        work ? 'bg-penguin-blue-soft text-penguin-blue-dark' : 'bg-penguin-pink-soft text-penguin-pink-dark'
      } ${p.running ? '' : 'opacity-70'}`}
    >
      <span aria-hidden>{work ? '🍅' : '☕'}</span>
      {fmtClock(p.remaining)}
      <span aria-hidden className="text-xs">{p.running ? '⏸' : '▶'}</span>
    </button>
  );
}
