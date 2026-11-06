import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type {
  Chapter,
  IglooSettings,
  Item,
  Note,
  ProofImage,
  Profile,
  StudySession,
  Subject,
} from './types';
import cloudConfig from '../dexie-cloud.json';

export class AppDB extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  items!: Table<Item, string>;
  proofImages!: Table<ProofImage, string>;
  sessions!: Table<StudySession, string>;
  notes!: Table<Note, string>;
  profiles!: Table<Profile, string>;
  igloo!: Table<IglooSettings, string>;
  // Tabelle di sistema di Dexie Cloud (condivisione)
  realms!: Table<any, string>;
  members!: Table<any, string>;
  roles!: Table<any, [string, string]>;

  constructor() {
    // Nome nuovo: il vecchio database locale "penguin-study" resta intatto e viene
    // copiato qui una sola volta (vedi lib/migrate.ts).
    super('penguin-study-cloud', { addons: [dexieCloud] });
    this.version(1).stores({
      subjects: 'id, name, createdAt',
      chapters: 'id, subjectId, order',
      items: 'id, subjectId, chapterId, type, createdAt, dueAt',
      proofImages: 'id, itemId, createdAt',
      sessions: 'id, userId, subjectId, endedAt',
      notes: 'id, createdAt',
      profiles: 'id, userId',
      igloo: 'id',
      realms: '@realmId',
      members: '@id, [realmId+email]',
      roles: '[realmId+name]',
    });

    this.cloud.configure({
      databaseUrl: cloudConfig.dbUrl,
      requireAuth: false, // l'app funziona anche senza login, offline
      customLoginGui: true,
      socialAuth: false,
      tryUseServiceWorker: false,
    });
  }
}

export const db = new AppDB();
