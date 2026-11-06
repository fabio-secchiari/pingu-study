import { useMemo, useState } from 'react';
import { db } from '../db';
import { uid, type Profile, type StudySession, type Subject } from '../types';
import { localDay } from '../lib/text';
import { realmPatch } from '../lib/cloud';

interface Props {
  sessions: StudySession[];
  subjects: Subject[];
  me: string;
  mine?: Profile;
  partner?: Profile;
}

type Who = 'io' | 'partner' | 'insieme';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const KIND_LABEL: Record<StudySession['kind'], string> = {
  pomodoro: '🍅 pomodoro',
  ripasso: '🃏 ripasso',
  manuale: '✍️ aggiunto a mano',
};

export function fmtMinutes(min: number): string {
  if (min <= 0) return '0m';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** Calendario mensile delle ore studiate, con monte ore totale e aggiunta manuale. */
export default function StudyCalendar({ sessions, subjects, me, mine, partner }: Props) {
  const [who, setWho] = useState<Who>('io');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(localDay());
  const [addOpen, setAddOpen] = useState(false);
  const [hours, setHours] = useState(1);
  const [mins, setMins] = useState(0);
  const [subjectId, setSubjectId] = useState('');

  const filtered = useMemo(
    () =>
      sessions.filter((s) =>
        who === 'io' ? s.userId === me : who === 'partner' ? s.userId === partner?.userId : true
      ),
    [sessions, who, me, partner?.userId]
  );

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of filtered) {
      const k = localDay(s.endedAt);
      map[k] = (map[k] ?? 0) + s.minutes;
    }
    return map;
  }, [filtered]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunedì = 0
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthDays = Object.entries(byDay).filter(([k]) => k.startsWith(monthKey));
  const monthTotal = monthDays.reduce((n, [, v]) => n + v, 0);
  const activeDays = monthDays.filter(([, v]) => v > 0).length;
  const allTotal = filtered.reduce((n, s) => n + s.minutes, 0);
  const max = Math.max(60, ...monthDays.map(([, v]) => v));
  const today = localDay();

  const daySessions = filtered
    .filter((s) => localDay(s.endedAt) === selected)
    .sort((a, b) => a.endedAt - b.endedAt);

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = Math.max(0, hours) * 60 + Math.max(0, mins);
    if (minutes <= 0) return;
    const [y, m, d] = selected.split('-').map(Number);
    const subj = subjects.find((x) => x.id === subjectId);
    await db.sessions.add({
      id: uid(),
      userId: me,
      kind: 'manuale',
      subjectId: subjectId || undefined,
      minutes,
      endedAt: new Date(y, m - 1, d, 12).getTime(),
      ...realmPatch(subj?.realmId),
    });
    setAddOpen(false);
  };

  const shade = (min: number) => {
    if (!min) return 'bg-white/70';
    const r = min / max;
    return r > 0.75 ? 'bg-penguin-blue-dark text-white' : r > 0.5 ? 'bg-penguin-blue text-white' : r > 0.25 ? 'bg-penguin-blue/50' : 'bg-penguin-blue-soft';
  };

  const whoLabel = (w: Who) => (w === 'io' ? mine?.name ?? 'Io' : w === 'partner' ? partner?.name ?? 'Partner' : 'Insieme');

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-white/80 border border-penguin-blue-soft space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold flex-1">📅 Calendario dello studio</h3>
        <div className="flex rounded-full bg-penguin-blue-soft/60 p-0.5 text-xs">
          {(['io', ...(partner ? ['partner', 'insieme'] : [])] as Who[]).map((w) => (
            <button
              key={w}
              onClick={() => setWho(w)}
              className={`px-3 py-1.5 rounded-full font-medium ${who === w ? 'bg-white shadow-sm' : 'text-ink/60'}`}
            >
              {whoLabel(w)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 rounded-2xl bg-penguin-blue-soft/50">
          <p className="text-[11px] text-ink/60">Monte ore totale</p>
          <p className="text-lg font-bold tabular-nums">{fmtMinutes(allTotal)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-penguin-pink-soft/70">
          <p className="text-[11px] text-ink/60">Questo mese</p>
          <p className="text-lg font-bold tabular-nums">{fmtMinutes(monthTotal)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-penguin-blue-soft">
          <p className="text-[11px] text-ink/60">Media per giorno di studio</p>
          <p className="text-lg font-bold tabular-nums">{fmtMinutes(activeDays ? monthTotal / activeDays : 0)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-ink/5"
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <p className="font-medium">
          <span className="capitalize">{cursor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span>
          <span className="text-xs text-ink/50 font-normal">
            {' '}
            · {activeDays} {activeDays === 1 ? 'giorno' : 'giorni'} di studio
          </span>
        </p>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-ink/5"
          aria-label="Mese successivo"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] text-ink/40 font-medium">
            {w}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={'e' + i} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${monthKey}-${String(day).padStart(2, '0')}`;
          const min = byDay[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`aspect-square sm:aspect-[4/3] rounded-xl flex flex-col items-center justify-center text-xs border transition ${shade(min)} ${
                selected === key ? 'border-penguin-pink-dark ring-2 ring-penguin-pink' : key === today ? 'border-penguin-blue-dark' : 'border-transparent'
              }`}
              title={`${day}: ${fmtMinutes(min)}`}
            >
              <span className="font-semibold">{day}</span>
              {min > 0 && <span className="text-[10px] leading-none tabular-nums opacity-90">{fmtMinutes(min)}</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border border-penguin-blue-soft p-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-medium flex-1">
            {new Date(selected + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="text-ink/50 font-normal"> · {fmtMinutes(byDay[selected] ?? 0)}</span>
          </p>
          {who !== 'partner' && (
            <button
              onClick={() => setAddOpen((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-penguin-blue-soft text-sm hover:bg-penguin-blue/30"
            >
              + Aggiungi ore
            </button>
          )}
        </div>

        {addOpen && (
          <form onSubmit={addManual} className="flex flex-wrap items-end gap-2 p-2 rounded-xl bg-penguin-blue-soft/40">
            <label className="text-xs">
              Ore
              <input type="number" min={0} max={16} value={hours} onChange={(e) => setHours(+e.target.value)} className="block w-16 px-2 py-1.5 rounded-lg border border-penguin-blue-soft bg-white" />
            </label>
            <label className="text-xs">
              Minuti
              <input type="number" min={0} max={59} step={5} value={mins} onChange={(e) => setMins(+e.target.value)} className="block w-16 px-2 py-1.5 rounded-lg border border-penguin-blue-soft bg-white" />
            </label>
            <label className="text-xs flex-1 min-w-36">
              Materia
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="block w-full px-2 py-1.5 rounded-lg border border-penguin-blue-soft bg-white">
                <option value="">Senza materia</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="px-4 py-1.5 rounded-lg bg-penguin-blue text-white text-sm font-medium">Salva</button>
          </form>
        )}

        {daySessions.length === 0 ? (
          <p className="text-sm text-ink/40">Nessuna sessione registrata in questo giorno.</p>
        ) : (
          <ul className="text-sm divide-y divide-ink/5">
            {daySessions.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="text-ink/50 tabular-nums w-12">
                  {s.kind === 'manuale' ? '—' : new Date(s.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex-1 truncate">
                  {subjects.find((x) => x.id === s.subjectId)?.name ?? 'Senza materia'}
                  <span className="text-xs text-ink/40"> · {KIND_LABEL[s.kind]}</span>
                  {who === 'insieme' && (
                    <span className="text-xs text-ink/40"> · {s.userId === me ? mine?.name ?? 'io' : partner?.name}</span>
                  )}
                </span>
                <span className="tabular-nums">{fmtMinutes(s.minutes)}</span>
                {s.kind === 'manuale' && s.userId === me && (
                  <button onClick={() => db.sessions.delete(s.id)} className="text-ink/30 hover:text-red-600 px-1" aria-label="Elimina">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
