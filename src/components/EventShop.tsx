import { db } from '../db';
import { cosmeticsOf, type CosmeticSlot, type Profile, type SeasonalCosmetic, type StudySession } from '../types';
import { activeEvents, coinsOf, daysLeft, itemsOf, owns, type EventInstance } from '../lib/events';
import Penguin from './Penguin';

const coinsText = (inst: EventInstance, n: number) =>
  `${n} ${n === 1 ? inst.def.currency.one : inst.def.currency.many}`;

/** Banner in cima all'igloo durante un evento. */
export function EventBanner({ sessions, mine, partner }: { sessions: StudySession[]; mine?: Profile; partner?: Profile }) {
  return (
    <>
      {activeEvents().map((inst) => {
        const days = daysLeft(inst);
        const me = coinsOf(inst, sessions, mine);
        const other = partner ? coinsOf(inst, sessions, partner) : null;
        return (
          <div
            key={inst.key}
            className="p-4 rounded-3xl bg-gradient-to-r from-[#e8f5ec] via-white to-[#fdeaea] border border-[#bfe0c8] flex flex-wrap items-center gap-3"
          >
            <span className="text-4xl" aria-hidden>
              {inst.def.emoji}
            </span>
            <div className="flex-1 min-w-52">
              <p className="font-bold">Evento {inst.def.name}</p>
              <p className="text-sm text-ink/70">
                Ogni pomodoro vale anche un {inst.def.currency.one} {inst.def.currency.emoji}: spendili per gli accessori in
                edizione limitata. {days <= 1 ? 'Ultimo giorno!' : `Mancano ${days} giorni.`}
              </p>
            </div>
            <div className="text-sm text-right tabular-nums">
              {mine && (
                <p>
                  {mine.name}: <b>{inst.def.currency.emoji} {me.left}</b>
                </p>
              )}
              {partner && other && (
                <p className="text-ink/60">
                  {partner.name}: {inst.def.currency.emoji} {other.left}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Negozio dell'evento: compra con le monete dell'evento, poi indossa. */
export default function EventShop({ sessions, mine }: { sessions: StudySession[]; mine: Profile }) {
  const current = cosmeticsOf(mine);

  const wear = (c: SeasonalCosmetic, slot: CosmeticSlot) => {
    const on = current[slot] === c.id;
    return db.profiles.update(mine.id, { cosmetics: { ...current, [slot]: on ? undefined : c.id }, accessory: undefined });
  };

  const buy = async (inst: EventInstance, c: SeasonalCosmetic) => {
    const { left } = coinsOf(inst, sessions, mine);
    if (left < c.cost || owns(mine, c.id)) return;
    if (!confirm(`Comprare "${c.label}" per ${coinsText(inst, c.cost)}? Resterà tuo per sempre.`)) return;
    await db.profiles.update(mine.id, {
      owned: [...(mine.owned ?? []), { id: c.id, event: inst.key, paid: c.cost, at: Date.now() }],
      // Lo indossi subito
      cosmetics: { ...current, [c.slot]: c.id },
      accessory: undefined,
    });
  };

  return (
    <div className="space-y-4">
      {activeEvents().map((inst) => {
        const coins = coinsOf(inst, sessions, mine);
        const items = itemsOf(inst);
        const groups = [...new Set(items.map((c) => c.group))];
        return (
          <div key={inst.key} className="space-y-3">
            <div className="p-3 rounded-2xl bg-[#eef8f1] border border-[#bfe0c8] text-sm space-y-0.5">
              <p>
                Hai <b>{inst.def.currency.emoji} {coins.left}</b> da spendere · {coins.earned} pomodori fatti durante
                l'evento
              </p>
              <p className="text-xs text-ink/60">
                Quello che compri resta tuo per sempre. {inst.def.expiry}: mancano {daysLeft(inst)} giorni.
              </p>
            </div>
            {groups.map((g) => (
              <div key={g} className="space-y-2">
                <p className="text-xs font-semibold text-ink/60">{g}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {items
                    .filter((c) => c.group === g)
                    .map((c) => {
                      const mineToo = owns(mine, c.id);
                      const missing = c.cost - coins.left;
                      const slots: CosmeticSlot[] = c.slot === 'pinna' ? ['pinnaSx', 'pinna'] : [c.slot];
                      return (
                        <div
                          key={c.id}
                          className={`p-2 rounded-2xl border text-center flex flex-col ${
                            mineToo ? 'border-[#9fd3b0] bg-[#f3fbf5]' : 'border-ink/10 bg-white'
                          }`}
                        >
                          <Penguin color={mine.color} cosmetics={{ [c.slot]: c.id }} className="w-10 h-12 mx-auto" />
                          <span className="block text-[11px] leading-tight mt-1 flex-1">{c.label}</span>
                          {mineToo ? (
                            <div className="flex gap-1 mt-1.5 justify-center">
                              {slots.map((sl) => (
                                <button
                                  key={sl}
                                  onClick={() => wear(c, sl)}
                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-medium ${
                                    current[sl] === c.id ? 'bg-penguin-blue text-white' : 'bg-penguin-blue-soft'
                                  }`}
                                >
                                  {current[sl] === c.id ? 'Togli' : sl === 'pinnaSx' ? 'Sx' : sl === 'pinna' ? 'Dx' : 'Indossa'}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => buy(inst, c)}
                              disabled={missing > 0}
                              className="mt-1.5 px-1.5 py-1 rounded-lg text-[11px] font-semibold bg-penguin-pink text-white disabled:bg-ink/5 disabled:text-ink/50"
                              title={missing > 0 ? `Ti mancano ${coinsText(inst, missing)}` : 'Compra'}
                            >
                              {inst.def.currency.emoji} {c.cost}
                            </button>
                          )}
                          {!mineToo && missing > 0 && <span className="text-[10px] text-ink/45 mt-0.5">ne mancano {missing}</span>}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
