import type { Item, StudyStatus } from '../types';

export type Grade = 'ancora' | 'difficile' | 'so';

const DAY = 86400000;

/** Ripetizione spaziata semplificata (stile SM-2). */
export function review(item: Item, grade: Grade, now = Date.now()): Partial<Item> {
  let ease = item.ease ?? 2.5;
  let interval = item.intervalDays ?? 0;

  if (grade === 'ancora') {
    ease = Math.max(1.3, ease - 0.2);
    interval = 0;
  } else if (grade === 'difficile') {
    ease = Math.max(1.3, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2));
  } else {
    interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
    ease = Math.min(3, ease + 0.05);
  }

  const status: StudyStatus =
    grade === 'ancora' ? 'da-studiare' : interval >= 21 ? 'padroneggiato' : 'ripassato';

  return {
    ease,
    intervalDays: interval,
    // "Ancora" torna fra 10 minuti, il resto fra N giorni
    dueAt: interval === 0 ? now + 10 * 60000 : now + interval * DAY,
    reviews: (item.reviews ?? 0) + 1,
    status,
  };
}

export const statusOf = (i: Item): StudyStatus => i.status ?? 'da-studiare';
export const isDue = (i: Item, now = Date.now()) => !i.dueAt || i.dueAt <= now;
