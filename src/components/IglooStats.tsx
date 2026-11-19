import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item, Profile, StudySession, Subject } from '../types';
import { countsInHours } from '../lib/stats';
import { localDay } from '../lib/text';
import { fmtMinutes } from './StudyCalendar';
import MathText from './MathText';

interface Props {
  sessions: StudySession[];
  subjects: Subject[];
  items: Item[];
  me: string;
  mine?: Profile;
  partner?: Profile;
}

type Who = 'io' | 'partner' | 'insieme';

const DAY = 86400000;
const WEEKS = 26;

function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunedì
  return x;
}

const daysAgo = (ms: number) => Math.floor((Date.now() - ms) / DAY);

/** Statistiche dell'igloo: mappa dei giorni, confronto settimanale, materie trascurate, carte difficili. */
export default function IglooStats({ sessions, subjects, items, me, mine, partner }: Props) {
  const nav = useNavigate();
  // Finché non scegli, "Insieme" se c'è l'altra persona (il profilo può arrivare dopo il primo render)
  const [picked, setWho] = useState<Who | null>(null);
  const who: Who = picked ?? (partner ? 'insieme' : 'io');
  const whoLabel = (w: Who) => (w === 'io' ? mine?.name ?? 'Io' : w === 'partner' ? partner?.name ?? 'Partner' : 'Insieme');
  const whoOf = (s: StudySession) => (who === 'io' ? s.userId === me : who === 'partner' ? s.userId === partner?.userId : true);

  /* ---------- Mappa dei giorni (stile GitHub) ---------- */
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (!countsInHours(s) || !whoOf(s)) continue;
      const k = localDay(s.endedAt);
      map[k] = (map[k] ?? 0) + s.minutes;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, who, me, partner?.userId]);

  const grid = useMemo(() => {
    const first = startOfWeek();
    first.setDate(first.getDate() - (WEEKS - 1) * 7);
    const today = localDay();
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        const key = localDay(date);
        return { key, date, min: byDay[key] ?? 0, future: key > today };
      })
    );
  }, [byDay]);

  // Su schermi stretti la mappa scorre: parti dalle settimane più recenti
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [grid]);

  const cells = grid.flat().filter((c) => !c.future);
  const bestDay = cells.reduce((b, c) => (c.min > b.min ? c : b), { key: '', min: 0, date: new Date() });
  const studiedDays = cells.filter((c) => c.min > 0).length;
  const shade = (min: number) =>
    !min ? 'bg-ink/5' : min >= 180 ? 'bg-penguin-blue-dark' : min >= 90 ? 'bg-penguin-blue' : min >= 30 ? 'bg-penguin-blue/55' : 'bg-penguin-blue/25';
  const monthLabel = (w: number) => {
    const d = grid[w][0].date;
    const prev = w > 0 ? grid[w - 1][0].date : null;
    return !prev || prev.getMonth() !== d.getMonth() ? d.toLocaleDateString('it-IT', { month: 'short' }) : '';
  };

  /* ---------- Questa settimana vs la scorsa ---------- */
  const week0 = startOfWeek().getTime();
  const week1 = week0 - 7 * DAY;
  const weekMinutes = (userId: string | undefined, from: number, to: number) =>
    sessions
      .filter((s) => countsInHours(s) && s.userId === userId && s.endedAt >= from && s.endedAt < to)
      .reduce((n, s) => n + s.minutes, 0);
  const people = [
    { id: me, name: mine?.name ?? 'Tu', color: mine?.color ?? 'blue' },
    ...(partner ? [{ id: partner.userId, name: partner.name, color: partner.color }] : []),
  ].map((p) => {
    // La settimana scorsa fino allo stesso momento, per un confronto giusto
    const elapsed = Date.now() - week0;
    return { ...p, now: weekMinutes(p.id, week0, Date.now() + 1), before: weekMinutes(p.id, week1, week1 + elapsed) };
  });

  /* ---------- Materie da riprendere ---------- */
  const neglected = subjects
    .filter((s) => !s.examPassed)
    .map((s) => {
      const last = Math.max(0, ...sessions.filter((x) => x.subjectId === s.id).map((x) => x.endedAt));
      const exam = s.examDate ? Math.ceil((new Date(s.examDate + 'T12:00').getTime() - Date.now()) / DAY) : undefined;
      return { s, days: last ? daysAgo(last) : Infinity, exam: exam !== undefined && exam >= 0 ? exam : undefined };
    })
    .filter((x) => x.days >= 3)
    // Prima quelle con l'esame vicino, poi le più dimenticate
    .sort((a, b) => (a.exam ?? 999) - (b.exam ?? 999) || b.days - a.days)
    .slice(0, 3);

  /* ---------- Carte più difficili ---------- */
  const hard = items
    .filter((i) => (i.reviews ?? 0) > 0 && (i.ease ?? 2.5) < 2.5)
    .sort((a, b) => (a.ease ?? 2.5) - (b.ease ?? 2.5) || (b.reviews ?? 0) - (a.reviews ?? 0))
    .slice(0, 5);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '';

  /* ---------- Quando studiate di più ---------- */
  const byHour: number[] = Array.from({ length: 24 }, () => 0);
  for (const s of sessions) if (countsInHours(s) && s.kind === 'pomodoro' && whoOf(s)) byHour[new Date(s.endedAt).getHours()] += s.minutes;
  const peak = byHour.indexOf(Math.max(...byHour));
  const peakLabel =
    byHour[peak] === 0 ? null : peak < 12 ? 'di mattina ☀️' : peak < 18 ? 'di pomeriggio 🌤️' : peak < 22 ? 'di sera 🌙' : 'di notte 🦉';

  return (
    <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-5 lg:col-span-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold flex-1">📊 Statistiche</h3>
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

      {/* Mappa dei giorni */}
      <div className="space-y-2">
        <div ref={scroller} className="overflow-x-auto pb-1">
          <div className="flex gap-[3px] w-max">
            <div className="flex flex-col gap-[3px] pt-4 pr-1 text-[9px] text-ink/40">
              {['L', '', 'M', '', 'V', '', 'D'].map((d, i) => (
                <span key={i} className="h-3.5 leading-[14px]">
                  {d}
                </span>
              ))}
            </div>
            {grid.map((week, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[9px] text-ink/40 leading-3 whitespace-nowrap">{monthLabel(w)}</span>
                {week.map((c) => (
                  <span
                    key={c.key}
                    title={c.future ? '' : `${c.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}: ${fmtMinutes(c.min)}`}
                    className={`w-3.5 h-3.5 rounded-[3px] ${c.future ? 'bg-transparent' : shade(c.min)} ${
                      c.key === localDay() ? 'ring-1 ring-penguin-pink-dark' : ''
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
          <span>
            <b>{studiedDays}</b> giorni di studio nelle ultime {WEEKS} settimane
          </span>
          {bestDay.min > 0 && (
            <span>
              🏆 Giorno record: <b>{fmtMinutes(bestDay.min)}</b> il{' '}
              {bestDay.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </span>
          )}
          {peakLabel && <span>⏰ Di solito {who === 'insieme' ? 'studiate' : who === 'io' ? 'studi' : 'studia'} {peakLabel}</span>}
          <span className="flex items-center gap-1 ml-auto">
            meno
            {[0, 20, 60, 120, 200].map((m) => (
              <span key={m} className={`w-2.5 h-2.5 rounded-[2px] ${shade(m)}`} />
            ))}
            più
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Settimana */}
        <div className="rounded-2xl bg-penguin-blue-soft/40 p-3 space-y-2">
          <p className="text-sm font-semibold">📅 Questa settimana</p>
          {people.map((p) => {
            const diff = p.now - p.before;
            return (
              <div key={p.id} className="flex items-baseline gap-2 text-sm">
                <span className="flex-1 truncate">{p.name}</span>
                <b className="tabular-nums">{fmtMinutes(p.now)}</b>
                {p.before > 0 || p.now > 0 ? (
                  <span className={`text-xs tabular-nums ${diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {diff >= 0 ? '▲' : '▼'} {fmtMinutes(Math.abs(diff))}
                  </span>
                ) : null}
              </div>
            );
          })}
          <p className="text-[11px] text-ink/50">Confronto con la settimana scorsa fino allo stesso giorno e ora.</p>
        </div>

        {/* Materie trascurate */}
        <div className="rounded-2xl bg-penguin-pink-soft/50 p-3 space-y-2">
          <p className="text-sm font-semibold">🧊 Da riprendere</p>
          {neglected.length === 0 ? (
            <p className="text-sm text-ink/60">Nessuna materia dimenticata: bravi! 🐧</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {neglected.map(({ s, days, exam }) => (
                <li key={s.id}>
                  <button onClick={() => nav(`/subject/${s.id}`)} className="text-left hover:underline">
                    <b>{s.name}</b>
                  </button>
                  <span className="block text-xs text-ink/60">
                    {days === Infinity ? 'mai studiata' : `ferma da ${days} giorni`}
                    {exam !== undefined && ` · esame ${exam === 0 ? 'oggi!' : `tra ${exam} ${exam === 1 ? 'giorno' : 'giorni'}`}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Carte difficili */}
        <div className="rounded-2xl bg-white border border-penguin-blue-soft p-3 space-y-2">
          <p className="text-sm font-semibold">🃏 Le carte più difficili</p>
          {hard.length === 0 ? (
            <p className="text-sm text-ink/60">Ancora nessuna: appaiono quando nel ripasso rispondete "Non la so".</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {hard.map((i) => (
                <li key={i.id}>
                  <button onClick={() => nav(`/subject/${i.subjectId}?item=${i.id}`)} className="text-left hover:underline">
                    <MathText>{i.title}</MathText>
                  </button>
                  <span className="block text-xs text-ink/50">
                    {subjName(i.subjectId)} · ripassata {i.reviews} {i.reviews === 1 ? 'volta' : 'volte'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
