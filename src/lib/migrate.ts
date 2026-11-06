import Dexie from 'dexie';
import { db } from '../db';

const FLAG = 'penguin-migrated-v1';
const OLD_DB = 'penguin-study';

/**
 * Copia (senza mai cancellare) i dati del vecchio database locale "penguin-study"
 * nel nuovo database sincronizzato. Il vecchio database resta intatto come copia di
 * sicurezza: se qualcosa andasse storto basta togliere il flag e ricaricare.
 *
 * Gli oggetti copiati prima del login vengono caricati nel cloud al primo accesso.
 */
export async function migrateFromLocalDb(): Promise<number> {
  try {
    if (localStorage.getItem(FLAG)) return 0;
  } catch {
    /* localStorage non disponibile: proviamo comunque, la copia è idempotente */
  }
  if (!(await Dexie.exists(OLD_DB))) {
    markDone();
    return 0;
  }

  const old = new Dexie(OLD_DB);
  old.version(1).stores({
    subjects: 'id, name, createdAt',
    chapters: 'id, subjectId, order',
    items: 'id, subjectId, chapterId, type, createdAt',
    proofImages: 'id, itemId, createdAt',
  });

  try {
    await old.open();
    const [subjects, chapters, items, images] = await Promise.all([
      old.table('subjects').toArray(),
      old.table('chapters').toArray(),
      old.table('items').toArray(),
      old.table('proofImages').toArray(),
    ]);

    // bulkPut con gli stessi id: rilanciare la migrazione non crea duplicati.
    await db.transaction('rw', db.subjects, db.chapters, db.items, db.proofImages, async () => {
      await db.subjects.bulkPut(subjects);
      await db.chapters.bulkPut(chapters);
      await db.items.bulkPut(items);
      await db.proofImages.bulkPut(images);
    });

    // Verifica: tutti gli elementi devono essere presenti prima di segnare come fatto.
    const copied = await db.items.where('id').anyOf(items.map((i) => i.id)).count();
    if (copied === items.length) markDone();
    return items.length;
  } finally {
    old.close();
  }
}

function markDone() {
  try {
    localStorage.setItem(FLAG, new Date().toISOString());
  } catch {
    /* ignore */
  }
}
