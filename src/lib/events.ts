import { SEASONAL_COSMETICS, type OwnedCosmetic, type Profile, type SeasonalCosmetic, type StudySession } from '../types';

/**
 * Eventi a tempo. Durante un evento ogni pomodoro vale anche una moneta dell'evento
 * (oltre al solito pesciolino), con cui si comprano i cosmetici a tema. Gli acquisti
 * restano per sempre; le monete avanzate a fine evento non valgono più.
 */
export interface EventDef {
  id: string;
  name: string;
  emoji: string;
  currency: { one: string; many: string; emoji: string };
  /** Mese (0 = gennaio) e giorno di inizio */
  start: [number, number];
  /** Mese e giorno dell'ultimo giorno (se è prima dell'inizio, è nell'anno dopo) */
  end: [number, number];
  /** Frase per quando le monete scadono */
  expiry: string;
}

export const EVENTS: EventDef[] = [
  {
    id: 'natale',
    name: 'Natale, Capodanno e Befana',
    emoji: '🎄',
    currency: { one: 'biscotto', many: 'biscotti', emoji: '🍪' },
    start: [10, 15], // 15 novembre
    end: [0, 6], // 6 gennaio
    expiry: 'Dopo la Befana i biscotti avanzati si sbriciolano',
  },
];

export interface EventInstance {
  def: EventDef;
  /** Edizione, es. "natale-2026" */
  key: string;
  /** Inizio (mezzanotte del primo giorno) */
  start: number;
  /** Fine esclusa (mezzanotte del giorno dopo l'ultimo) */
  end: number;
}

function instanceFor(def: EventDef, startYear: number): EventInstance {
  const start = new Date(startYear, def.start[0], def.start[1]);
  const endYear = def.end[0] < def.start[0] ? startYear + 1 : startYear;
  const end = new Date(endYear, def.end[0], def.end[1] + 1);
  return { def, key: `${def.id}-${startYear}`, start: start.getTime(), end: end.getTime() };
}

/** Gli eventi in corso adesso. */
export function activeEvents(now = Date.now()): EventInstance[] {
  const y = new Date(now).getFullYear();
  const out: EventInstance[] = [];
  for (const def of EVENTS) {
    for (const year of [y - 1, y]) {
      const inst = instanceFor(def, year);
      if (now >= inst.start && now < inst.end) out.push(inst);
    }
  }
  return out;
}

/** Il prossimo evento che deve ancora iniziare. */
export function nextEvent(now = Date.now()): EventInstance | undefined {
  const y = new Date(now).getFullYear();
  return EVENTS.flatMap((def) => [instanceFor(def, y), instanceFor(def, y + 1)])
    .filter((i) => i.start > now)
    .sort((a, b) => a.start - b.start)[0];
}

export const daysLeft = (inst: EventInstance, now = Date.now()) => Math.ceil((inst.end - now) / 86400000);

export const itemsOf = (inst: EventInstance): readonly SeasonalCosmetic[] =>
  SEASONAL_COSMETICS.filter((c) => c.event === inst.def.id);

export const isSeasonal = (id?: string) => !!id && SEASONAL_COSMETICS.some((c) => c.id === id);

/** Monete di un evento: pomodori fatti nel periodo meno quelle già spese. */
export function coinsOf(inst: EventInstance, sessions: StudySession[], profile?: Profile) {
  if (!profile) return { earned: 0, spent: 0, left: 0 };
  const earned = sessions.filter(
    (s) => s.kind === 'pomodoro' && s.userId === profile.userId && s.endedAt >= inst.start && s.endedAt < inst.end
  ).length;
  const spent = (profile.owned ?? []).filter((o) => o.event === inst.key).reduce((n, o) => n + o.paid, 0);
  return { earned, spent, left: Math.max(0, earned - spent) };
}

export const owns = (profile: Profile | undefined, id: string) => !!profile?.owned?.some((o) => o.id === id);

/** Anno da mostrare sul cosmetico comprato, es. "🎄 2026". */
export function ownedBadge(o: OwnedCosmetic | undefined): string {
  if (!o) return '';
  const [id, year] = o.event.split('-');
  const def = EVENTS.find((e) => e.id === id);
  return def ? `${def.emoji} ${year}` : '';
}
