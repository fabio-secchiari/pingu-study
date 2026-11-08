import type { IglooSettings, StudySession } from '../types';
import { localDay } from './text';

/** Ogni pomodoro vale un pesciolino (due nel compleanno del pinguino domestico). */
export function fishOf(sessions: StudySession[], userId: string | null, igloo: IglooSettings): number {
  const bday = igloo.petBirthday.slice(5);
  return sessions
    .filter((s) => s.kind === 'pomodoro' && (userId === null || s.userId === userId))
    .reduce((n, s) => n + (localDay(s.endedAt).slice(5) === bday ? 2 : 1), 0);
}

/** Giorni consecutivi (fino a oggi o ieri) in cui almeno uno dei due ha studiato. */
export function streak(sessions: StudySession[]): number {
  const days = new Set(sessions.map((s) => localDay(s.endedAt)));
  const d = new Date();
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1); // la serie non si rompe finché oggi non è finito
  let n = 0;
  while (days.has(localDay(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Umore del pinguino domestico in base all'ultimo studio. */
export function petMood(sessions: StudySession[]): { mood: 'happy' | 'sleepy' | 'sad' | 'love'; text: string } {
  if (sessions.length === 0) return { mood: 'happy', text: 'aspetta il primo pomodoro per assaggiare un pesciolino.' };
  const last = Math.max(0, ...sessions.map((s) => s.endedAt));
  const hours = (Date.now() - last) / 3600000;
  const today = sessions.filter((s) => localDay(s.endedAt) === localDay()).length;
  if (today >= 4) return { mood: 'love', text: 'è al settimo cielo: oggi ha mangiato tantissimi pesciolini!' };
  if (hours < 24) return { mood: 'happy', text: 'è sazio e contento.' };
  if (hours < 72) return { mood: 'sleepy', text: 'sonnecchia… un pomodoro lo sveglierebbe.' };
  return { mood: 'sad', text: 'ha fame! Fate un pomodoro per dargli un pesciolino.' };
}

/**
 * Conta nelle ore di studio? Il ripasso no: di solito lo fai durante un pomodoro, e
 * contarlo di nuovo raddoppierebbe il tempo. Resta comunque nella serie di giorni.
 */
export const countsInHours = (s: StudySession) => s.kind !== 'ripasso';

export function minutesBySubject(sessions: StudySession[], sinceMs: number) {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (s.endedAt < sinceMs || !countsInHours(s)) continue;
    const k = s.subjectId ?? '';
    map[k] = (map[k] ?? 0) + s.minutes;
  }
  return map;
}
