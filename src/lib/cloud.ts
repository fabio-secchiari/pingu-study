import { liveQuery } from 'dexie';
import { useLiveQuery, useObservable } from 'dexie-react-hooks';
import { db } from '../db';
import { uid, type IglooSettings, type Profile } from '../types';

export const UNAUTHORIZED = 'unauthorized';

/** Utente corrente (reattivo). `isLoggedIn` è false finché non si accede. */
export function useCurrentUser() {
  return useObservable(db.cloud.currentUser);
}

export function useMyUserId(): string {
  const user = useCurrentUser();
  return user?.userId ?? UNAUTHORIZED;
}

// --- Realm condiviso (l'igloo) ----------------------------------------------------

let sharedRealmCache: string | undefined;

/**
 * L'igloo condiviso è un realm che l'utente ha creato oppure di cui ha ACCETTATO l'invito.
 * I realm degli inviti ancora in sospeso (o rifiutati) non contano: altrimenti i nuovi dati
 * finirebbero nell'igloo di chiunque ci abbia invitato.
 */
async function findSharedRealm(): Promise<string | undefined> {
  const me = db.cloud.currentUserId;
  const email = db.cloud.currentUser.value?.email?.toLowerCase();
  if (!me || me === UNAUTHORIZED) return undefined;
  const realms = await db.realms.toArray();
  const members = await db.members.toArray();
  const candidates = realms.filter((r) => r.realmId !== me && r.realmId !== 'rlm-public');
  return candidates.find((r) => {
    if (r.owner === me) return true;
    return members.some(
      (m) =>
        m.realmId === r.realmId &&
        (m.userId === me || (email && m.email?.toLowerCase() === email)) &&
        !!m.accepted &&
        !m.rejected
    );
  })?.realmId;
}

liveQuery(findSharedRealm).subscribe({
  next: (realmId) => (sharedRealmCache = realmId),
  error: () => {},
});

export function useSharedRealmId(): string | undefined {
  return useLiveQuery(findSharedRealm, []);
}

/**
 * Campo realmId da mettere sugli oggetti nuovi: se esiste l'igloo condiviso finiscono lì,
 * altrimenti Dexie Cloud li mette nel realm privato dell'utente.
 */
export function realmPatch(parentRealmId?: string): { realmId?: string } {
  const r = parentRealmId ?? sharedRealmCache;
  return r ? { realmId: r } : {};
}

const SHARED_TABLES = () => [
  db.subjects,
  db.chapters,
  db.items,
  db.proofImages,
  db.sessions,
  db.notes,
  db.profiles,
  db.igloo,
];

/** Crea l'igloo condiviso, invita il/la partner e ci sposta dentro i propri dati. */
export async function createIgloo(partnerEmail: string): Promise<string> {
  const email = partnerEmail.trim().toLowerCase();
  return db.transaction('rw', [db.realms, db.members, ...SHARED_TABLES()], async () => {
    const realmId: string = await db.realms.add({
      name: 'Il nostro igloo',
      represents: 'un igloo per studiare insieme',
    });
    await db.members.add({
      realmId,
      email,
      invite: true,
      permissions: { manage: '*' },
    });
    await moveMineInto(realmId);
    return realmId;
  });
}

/** Sposta nell'igloo tutto ciò che possiede l'utente corrente (dopo aver accettato un invito). */
export async function moveMyDataToIgloo(realmId: string) {
  await db.transaction('rw', SHARED_TABLES(), () => moveMineInto(realmId));
}

async function moveMineInto(realmId: string) {
  const me = db.cloud.currentUserId;
  for (const table of SHARED_TABLES()) {
    await (table as any)
      .filter((o: any) => o.realmId !== realmId && (!o.owner || o.owner === me))
      .modify({ realmId });
  }
}

export async function inviteToIgloo(realmId: string, partnerEmail: string) {
  await db.members.add({
    realmId,
    email: partnerEmail.trim().toLowerCase(),
    invite: true,
    permissions: { manage: '*' },
  });
}

// --- Profili ---------------------------------------------------------------------

export function useProfiles() {
  const me = useMyUserId();
  const profiles = useLiveQuery(() => db.profiles.toArray(), []) ?? [];
  const mine = profiles.find((p) => p.userId === me);
  const partner = profiles.find((p) => p.userId !== me && p.userId !== UNAUTHORIZED);
  return { me, mine, partner, profiles };
}

/** Crea il profilo dell'utente al primo accesso e riassegna le sessioni fatte prima del login. */
export async function ensureProfile(userId: string, email?: string) {
  if (userId === UNAUTHORIZED) return;
  await db.sessions.where('userId').equals(UNAUTHORIZED).modify({ userId });
  const existing = await db.profiles.where('userId').equals(userId).first();
  if (existing) return;
  const name = (email ?? userId).split('@')[0];
  const profile: Profile = {
    id: uid(),
    userId,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    color: 'blue',
    accessory: 'none',
    ...realmPatch(),
  };
  await db.profiles.add(profile);
}

// --- Riallineamento con l'igloo ---------------------------------------------------

/**
 * Porta nell'igloo condiviso il profilo, i pomodori e i bigliettini dell'utente corrente,
 * anche se erano stati creati prima di entrare nell'igloo (o prima che l'app se ne accorgesse).
 * Le materie restano dove sono: si spostano solo col pulsante apposito.
 */
export async function reconcileWithIgloo(realmId: string, me: string) {
  if (!realmId || !me || me === UNAUTHORIZED) return 0;
  // Solo ciò che sta nello spazio privato: mai spostare dati già in un altro realm condiviso.
  const isPrivate = (r?: string) => !r || r === me;
  return db.transaction('rw', [db.profiles, db.sessions, db.notes, db.igloo], async () => {
    let moved = 0;
    moved += await db.profiles.filter((p) => p.userId === me && isPrivate(p.realmId)).modify({ realmId });
    moved += await db.sessions.filter((x) => x.userId === me && isPrivate(x.realmId)).modify({ realmId });
    moved += await db.notes.filter((n) => n.fromUserId === me && isPrivate(n.realmId)).modify({ realmId });
    // Impostazioni del pinguino: se nell'igloo non ce ne sono ancora, ci porto le mie.
    const all = await db.igloo.toArray();
    if (!all.some((r) => r.realmId === realmId)) {
      const mine = all.find((r) => (!r.owner || r.owner === me) && isPrivate(r.realmId));
      if (mine) {
        await db.igloo.update(mine.id, { realmId });
        moved++;
      }
    }
    return moved;
  });
}

/** Quanti oggetti "di coppia" dell'utente non sono ancora nell'igloo (reattivo). */
export function useMisplacedCount(realmId: string | undefined, me: string): number {
  return (
    useLiveQuery(async () => {
      if (!realmId || me === UNAUTHORIZED) return 0;
      const priv = (r?: string) => !r || r === me;
      const [p, s, n] = await Promise.all([
        db.profiles.filter((x) => x.userId === me && priv(x.realmId)).count(),
        db.sessions.filter((x) => x.userId === me && priv(x.realmId)).count(),
        db.notes.filter((x) => x.fromUserId === me && priv(x.realmId)).count(),
      ]);
      return p + s + n;
    }, [realmId, me]) ?? 0
  );
}

// --- Impostazioni dell'igloo -------------------------------------------------------

export const DEFAULT_IGLOO: Omit<IglooSettings, 'id'> = {
  petName: 'Pingu',
  petBirthday: '2026-01-28',
  anniversary: '2026-02-22',
};

/** Le prime versioni salvavano l'anniversario come "MM-DD": lo completo con l'anno 2026. */
function normalizeIgloo(row: IglooSettings): IglooSettings {
  const anniversary = /^\d{2}-\d{2}$/.test(row.anniversary) ? `2026-${row.anniversary}` : row.anniversary;
  return { ...DEFAULT_IGLOO, ...row, anniversary };
}

export function useIgloo(): IglooSettings {
  const rows = useLiveQuery(() => db.igloo.toArray(), []);
  const shared = useSharedRealmId();
  // Preferisci le impostazioni che stanno nell'igloo condiviso.
  const row = rows?.find((r) => shared && r.realmId === shared) ?? rows?.[0];
  return normalizeIgloo(row ?? { id: '', ...DEFAULT_IGLOO });
}

export async function saveIgloo(patch: Partial<IglooSettings>) {
  const rows = await db.igloo.toArray();
  const shared = sharedRealmCache;
  const sharedRow = shared ? rows.find((r) => r.realmId === shared) : undefined;
  if (sharedRow) return db.igloo.update(sharedRow.id, patch);
  if (shared) {
    // C'è l'igloo ma non ancora le sue impostazioni: le creo lì partendo da quelle locali
    const base = rows[0] ? normalizeIgloo(rows[0]) : { id: '', ...DEFAULT_IGLOO };
    return db.igloo.add({ ...base, ...patch, id: uid(), realmId: shared, owner: undefined });
  }
  if (rows[0]) return db.igloo.update(rows[0].id, patch);
  return db.igloo.add({ id: uid(), ...DEFAULT_IGLOO, ...patch });
}
