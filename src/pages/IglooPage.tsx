import { useState } from 'react';
import { useLiveQuery, useObservable } from 'dexie-react-hooks';
import { db } from '../db';
import { COSMETICS, SLOT_LABELS, cosmeticsOf, uid, type CosmeticSlot, type Profile } from '../types';
import Penguin from '../components/Penguin';
import {
  createIgloo,
  inviteToIgloo,
  moveMyDataToIgloo,
  realmPatch,
  saveIgloo,
  useCurrentUser,
  useIgloo,
  useProfiles,
  useSharedRealmId,
} from '../lib/cloud';
import { fishOf, petMood, streak } from '../lib/stats';
import { monthsTogether, petAgeDays, specialDays } from '../lib/special';
import { daysUntil } from '../lib/text';

function StudyingBadge({ p }: { p?: Profile }) {
  if (!p?.studyingUntil || p.studyingUntil < Date.now()) return null;
  const mins = Math.ceil((p.studyingUntil - Date.now()) / 60000);
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-penguin-blue text-white">
      📚 sta studiando · {mins} min
    </span>
  );
}

function nextBirthdayDays(birthday: string) {
  const [, m, d] = birthday.split('-').map(Number);
  const now = new Date();
  let y = now.getFullYear();
  const iso = (yy: number) => `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (daysUntil(iso(y)) < 0) y++;
  return daysUntil(iso(y));
}

export default function IglooPage() {
  const user = useCurrentUser();
  const loggedIn = !!user?.isLoggedIn;
  const shared = useSharedRealmId();
  const invites = useObservable(db.cloud.invites) ?? [];
  const pendingInvites = invites.filter((i: any) => !i.accepted && !i.rejected);
  const { me, mine, partner } = useProfiles();
  const igloo = useIgloo();
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.orderBy('createdAt').reverse().limit(20).toArray(), []) ?? [];
  const members = useLiveQuery(() => (shared ? db.members.where('realmId').equals(shared).toArray() : []), [shared]) ?? [];

  const [partnerEmail, setPartnerEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<CosmeticSlot>('testa');

  const myFish = fishOf(sessions, me, igloo);
  const partnerFish = partner ? fishOf(sessions, partner.userId, igloo) : 0;
  const totalFish = fishOf(sessions, null, igloo);
  const days = streak(sessions);
  const pet = petMood(sessions);
  const age = petAgeDays(igloo.petBirthday);
  const special = specialDays(igloo);
  const bothStudying =
    !!mine?.studyingUntil && mine.studyingUntil > Date.now() && !!partner?.studyingUntil && partner.studyingUntil > Date.now();

  const updateMine = (patch: Partial<Profile>) => mine && db.profiles.update(mine.id, patch);

  const sendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    if (!shared) return alert("Prima entrate nello stesso igloo (qui sotto), poi i bigliettini arrivano all'altra persona.");
    await db.notes.add({
      id: uid(),
      fromUserId: me,
      fromName: mine?.name ?? 'Io',
      text: note.trim(),
      createdAt: Date.now(),
      readBy: [me],
      realmId: shared,
    });
    setNote('');
  };

  const doCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(partnerEmail)) return alert('Scrivi un indirizzo email valido.');
    setBusy(true);
    try {
      await createIgloo(partnerEmail);
      setPartnerEmail('');
    } finally {
      setBusy(false);
    }
  };

  // Scena: dimensione dell'iceberg in base alla serie di giorni
  const iceWidth = Math.min(100, 55 + days * 3);

  return (
    <div className="space-y-6">
      {special.map((s) => (
        <div key={s.kind} className="p-4 rounded-3xl bg-penguin-pink-soft border border-penguin-pink flex items-center gap-4">
          <span className="text-4xl" aria-hidden>
            {s.emoji}
          </span>
          <div>
            <p className="font-bold">{s.title}</p>
            <p className="text-sm text-ink/70">{s.subtitle}</p>
          </div>
        </div>
      ))}

      {pendingInvites.map((inv: any) => (
        <div key={inv.id} className="p-4 rounded-3xl bg-white border-2 border-penguin-pink flex flex-wrap items-center gap-3">
          <span className="text-3xl">💌</span>
          <p className="flex-1 min-w-48">
            <b>{inv.invitedBy?.name || inv.invitedBy?.email || 'Qualcuno'}</b> ti ha invitato nel suo igloo
            {inv.realm?.name ? ` "${inv.realm.name}"` : ''}.
          </p>
          <button
            onClick={async () => {
              await inv.accept();
              if (confirm('Vuoi portare anche le tue materie nell\'igloo condiviso?')) {
                await moveMyDataToIgloo(inv.realmId);
              }
            }}
            className="px-4 py-2 rounded-2xl bg-penguin-pink text-white font-medium"
          >
            Entra nell'igloo
          </button>
          <button onClick={() => inv.reject()} className="px-3 py-2 rounded-2xl text-ink/60 hover:bg-ink/5">
            No grazie
          </button>
        </div>
      ))}

      {/* La scena */}
      <section className="relative overflow-hidden rounded-3xl border border-penguin-blue-soft bg-gradient-to-b from-[#dceefc] to-[#f4f9fe] px-4 pt-6 pb-4">
        <div className="flex items-end justify-center gap-2 sm:gap-6 relative z-10">
          <div className="flex flex-col items-center gap-1 w-28 sm:w-36">
            <StudyingBadge p={mine} />
            <Penguin
              color={mine?.color ?? 'blue'}
              cosmetics={cosmeticsOf(mine)}
              mood={bothStudying ? 'love' : 'happy'}
              className="w-20 h-24 sm:w-28 sm:h-32"
              title={mine?.name ?? 'Tu'}
            />
            <p className="font-semibold text-sm">{mine?.name ?? 'Tu'}</p>
            <p className="text-xs text-ink/60">🐟 {myFish}</p>
          </div>

          <div className="flex flex-col items-center gap-1 w-24 sm:w-28 pb-1">
            <span className="text-[11px] text-center text-ink/60 leading-tight">{igloo.petName}</span>
            <Penguin color="blue" mood={pet.mood} className="w-12 h-14 sm:w-16 sm:h-20" title={igloo.petName} />
            <p className="text-[11px] text-ink/50">{age} giorni</p>
          </div>

          <div className="flex flex-col items-center gap-1 w-28 sm:w-36">
            {partner ? (
              <>
                <StudyingBadge p={partner} />
                <Penguin
                  color={partner.color}
                  cosmetics={cosmeticsOf(partner)}
                  mood={bothStudying ? 'love' : 'happy'}
                  className="w-20 h-24 sm:w-28 sm:h-32"
                  title={partner.name}
                />
                <p className="font-semibold text-sm">{partner.name}</p>
                <p className="text-xs text-ink/60">🐟 {partnerFish}</p>
              </>
            ) : (
              <>
                <div className="w-20 h-24 sm:w-28 sm:h-32 rounded-full border-2 border-dashed border-penguin-pink/60 flex items-center justify-center text-3xl text-penguin-pink">
                  ?
                </div>
                <p className="text-xs text-ink/50 text-center">Il posto per il tuo pinguino del cuore</p>
              </>
            )}
          </div>
        </div>
        {/* Iceberg */}
        <div
          className="mx-auto -mt-3 h-10 rounded-[50%] bg-white border border-penguin-blue-soft shadow-inner transition-all"
          style={{ width: `${iceWidth}%` }}
        />
        <div className="mt-3 text-center text-sm text-ink/70 space-y-1">
          {bothStudying && <p className="font-semibold text-penguin-pink-dark">💞 State studiando insieme in questo momento!</p>}
          <p>
            {igloo.petName} {pet.text}
          </p>
          <p className="text-xs text-ink/50">
            🔥 Serie: <b>{days}</b> {days === 1 ? 'giorno' : 'giorni'} di studio di fila · 🐟 {totalFish} pesciolini in tutto · 🎂
            compleanno tra {nextBirthdayDays(igloo.petBirthday)} giorni
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bigliettini */}
        <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
          <h3 className="font-semibold">💌 Bigliettini</h3>
          {!loggedIn && <p className="text-sm text-ink/60">Accedi e crea l'igloo per lasciarvi messaggi.</p>}
          {loggedIn && (
          <form onSubmit={sendNote} className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              placeholder="Forza per lo scritto di domani! 💪"
              aria-label="Nuovo bigliettino"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-penguin-pink-soft/50 border border-penguin-pink/40 focus:outline-none focus:ring-2 focus:ring-penguin-pink"
            />
            <button className="px-4 py-2.5 rounded-2xl bg-penguin-pink text-white font-medium hover:bg-penguin-pink-dark">Invia</button>
          </form>
          )}
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {notes.map((n) => (
              <li
                key={n.id}
                className={`p-3 rounded-2xl text-sm ${
                  n.fromUserId === me ? 'bg-penguin-blue-soft/60 ml-8' : 'bg-penguin-pink-soft mr-8'
                }`}
              >
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{n.text}</p>
                <p className="text-[11px] text-ink/50 mt-1">
                  {n.fromName} · {new Date(n.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                  {n.fromUserId === me && partner && n.readBy.includes(partner.userId) && ' · letto ❤'}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Il mio pinguino */}
        <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
          <h3 className="font-semibold">🐧 Il mio pinguino</h3>
          {!mine ? (
            <p className="text-sm text-ink/60">Accedi per avere il tuo pinguino personale.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  value={mine.name}
                  onChange={(e) => updateMine({ name: e.target.value })}
                  aria-label="Nome"
                  className="flex-1 min-w-32 px-3 py-2 rounded-xl border border-penguin-blue-soft"
                />
                {(['blue', 'pink'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateMine({ color: c })}
                    className={`w-10 h-10 rounded-full border-2 ${mine.color === c ? 'border-ink' : 'border-transparent'} ${
                      c === 'blue' ? 'bg-penguin-blue' : 'bg-penguin-pink'
                    }`}
                    aria-label={c === 'blue' ? 'Blu' : 'Rosa'}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Penguin color={mine.color} cosmetics={cosmeticsOf(mine)} className="w-16 h-20 shrink-0" />
                <p className="text-xs text-ink/50">
                  Combina un cosmetico per ogni zona. Si sbloccano con i pesciolini (1 pomodoro = 1 🐟): ne hai{' '}
                  <b>{myFish}</b>.
                </p>
              </div>
              <div className="flex gap-1 rounded-full bg-penguin-blue-soft/60 p-0.5 text-xs w-fit">
                {(Object.keys(SLOT_LABELS) as CosmeticSlot[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSlot(k)}
                    className={`px-3 py-1.5 rounded-full font-medium ${slot === k ? 'bg-white shadow-sm' : 'text-ink/60'}`}
                  >
                    {SLOT_LABELS[k]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[{ id: undefined, label: 'Niente', fish: 0 }, ...COSMETICS.filter((c) => c.slot === slot)].map((c) => {
                  const current = cosmeticsOf(mine);
                  const locked = myFish < c.fish;
                  const selected = current[slot] === c.id;
                  return (
                    <button
                      key={c.id ?? 'none'}
                      disabled={locked}
                      onClick={() => updateMine({ cosmetics: { ...current, [slot]: c.id }, accessory: undefined })}
                      className={`p-2 rounded-2xl border text-center ${
                        selected ? 'border-penguin-blue bg-penguin-blue-soft' : 'border-ink/10 bg-white'
                      } ${locked ? 'opacity-40' : 'hover:bg-penguin-blue-soft/50'}`}
                    >
                      <Penguin color={mine.color} cosmetics={{ [slot]: c.id }} className="w-10 h-12 mx-auto" />
                      <span className="block text-[11px] leading-tight mt-1">{c.label}</span>
                      {locked && <span className="block text-[10px] text-ink/60">🔒 {c.fish} 🐟</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Igloo condiviso */}
        <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
          <h3 className="font-semibold">🏠 Igloo condiviso</h3>
          {!loggedIn ? (
            <>
              <p className="text-sm text-ink/60">
                Accedi con la tua email per sincronizzare i dati tra iPad e computer e condividerli con la tua metà.
              </p>
              <button onClick={() => db.cloud.login()} className="px-4 py-2.5 rounded-2xl bg-penguin-blue text-white font-medium">
                Accedi
              </button>
            </>
          ) : shared ? (
            <>
              <p className="text-sm text-ink/70">
                Siete nello stesso igloo: materie, pomodori e bigliettini sono condivisi. Membri:
              </p>
              <ul className="text-sm space-y-1">
                <li>• {user?.email} (tu)</li>
                {members
                  .filter((m: any) => m.email && m.email !== user?.email)
                  .map((m: any) => (
                    <li key={m.id}>
                      • {m.email} {m.accepted ? '✅' : m.rejected ? '❌ ha rifiutato' : '⏳ invito in attesa'}
                    </li>
                  ))}
              </ul>
              {members.filter((m: any) => m.email !== user?.email).length === 0 && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await inviteToIgloo(shared, partnerEmail);
                    setPartnerEmail('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="email della tua metà"
                    className="flex-1 px-3 py-2 rounded-xl border border-penguin-blue-soft"
                  />
                  <button className="px-4 py-2 rounded-xl bg-penguin-pink text-white">Invita</button>
                </form>
              )}
              <button onClick={() => moveMyDataToIgloo(shared)} className="text-xs text-ink/50 underline">
                Sposta nell'igloo eventuali materie rimaste private
              </button>
            </>
          ) : (
            <form onSubmit={doCreate} className="space-y-2">
              <p className="text-sm text-ink/60">
                Crea l'igloo e invita la tua metà: riceverà l'invito appena accede con quella email. Le tue materie
                verranno spostate nell'igloo, così le vedete entrambi.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="email della tua metà"
                  aria-label="Email da invitare"
                  className="flex-1 px-3 py-2 rounded-xl border border-penguin-blue-soft"
                />
                <button disabled={busy} className="px-4 py-2 rounded-xl bg-penguin-pink text-white font-medium disabled:opacity-50">
                  Crea igloo
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Il pinguino domestico */}
        <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
          <h3 className="font-semibold">🐣 Il nostro pinguino</h3>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <label>
              Nome
              <input
                defaultValue={igloo.petName}
                key={igloo.id + igloo.petName}
                onBlur={(e) => e.target.value.trim() && saveIgloo({ petName: e.target.value.trim() })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-penguin-blue-soft"
              />
            </label>
            <label>
              Nato il
              <input
                type="date"
                value={igloo.petBirthday}
                onChange={(e) => e.target.value && saveIgloo({ petBirthday: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-penguin-blue-soft"
              />
            </label>
            <label>
              Anniversario
              <input
                type="date"
                value={igloo.anniversary}
                onChange={(e) => e.target.value && saveIgloo({ anniversary: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-penguin-blue-soft"
              />
            </label>
          </div>
          <p className="text-xs text-ink/50">
            Ha {age} giorni. Voi state insieme da {monthsTogether(igloo.anniversary)} mesi: ogni{' '}
            {Number(igloo.anniversary.slice(8))} del mese c'è una sorpresa per il mesiversario, e nel compleanno di{' '}
            {igloo.petName} i pomodori valgono doppio.
          </p>
        </section>
      </div>
    </div>
  );
}
