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

function pickShared(realms: any[]): string | undefined {
  const me = db.cloud.currentUserId;
  return realms.find((r) => r.realmId !== me && r.realmId !== 'rlm-public')?.realmId;
}

liveQuery(() => db.realms.toArray()).subscribe({
  next: (realms) => (sharedRealmCache = pickShared(realms)),
  error: () => {},
});

export function useSharedRealmId(): string | undefined {
  return useLiveQuery(async () => pickShared(await db.realms.toArray()), []);
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

// --- Impostazioni dell'igloo -------------------------------------------------------

export const DEFAULT_IGLOO: Omit<IglooSettings, 'id'> = {
  petName: 'Pingu',
  petBirthday: '2026-01-28',
  anniversary: '02-22',
};

export function useIgloo(): IglooSettings {
  const rows = useLiveQuery(() => db.igloo.toArray(), []);
  const shared = useSharedRealmId();
  // Preferisci le impostazioni che stanno nell'igloo condiviso.
  const row = rows?.find((r) => shared && r.realmId === shared) ?? rows?.[0];
  return row ?? { id: '', ...DEFAULT_IGLOO };
}

export async function saveIgloo(patch: Partial<IglooSettings>) {
  const rows = await db.igloo.toArray();
  const shared = sharedRealmCache;
  const row = rows.find((r) => shared && r.realmId === shared) ?? rows[0];
  if (row) await db.igloo.update(row.id, patch);
  else await db.igloo.add({ id: uid(), ...DEFAULT_IGLOO, ...patch, ...realmPatch() });
}
