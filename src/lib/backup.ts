import { db } from '../db';
import { BackupSchema, type Backup } from './schema';
import { uid } from '../types';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function exportBackup(): Promise<Backup> {
  const subjects = await db.subjects.toArray();
  const chapters = await db.chapters.toArray();
  const items = await db.items.toArray();
  const images = await db.proofImages.toArray();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: await Promise.all(
      subjects.map(async (s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        createdAt: s.createdAt,
        chapters: await Promise.all(
          chapters
            .filter((c) => c.subjectId === s.id)
            .sort((a, b) => a.order - b.order)
            .map(async (c) => ({
              id: c.id,
              title: c.title,
              order: c.order,
              items: await Promise.all(
                items
                  .filter((i) => i.chapterId === c.id)
                  .map(async (i) => ({
                    id: i.id,
                    type: i.type,
                    title: i.title,
                    description: i.description,
                    needsProof: i.needsProof,
                    proofText: i.proofText,
                    createdAt: i.createdAt,
                    proofImages: await Promise.all(
                      images
                        .filter((img) => img.itemId === i.id)
                        .map(async (img) => ({
                          id: img.id,
                          createdAt: img.createdAt,
                          dataUrl: await blobToDataUrl(img.blob),
                        }))
                    ),
                  }))
              ),
            }))
        ),
      }))
    ),
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import di un backup: sovrascrive tutto. */
export async function importBackup(raw: unknown, { wipe = true } = {}) {
  const data = BackupSchema.parse(raw);

  await db.transaction('rw', db.subjects, db.chapters, db.items, db.proofImages, async () => {
    if (wipe) {
      await Promise.all([
        db.subjects.clear(),
        db.chapters.clear(),
        db.items.clear(),
        db.proofImages.clear(),
      ]);
    }

    for (const s of data.subjects) {
      await db.subjects.put({
        id: s.id,
        name: s.name,
        color: s.color ?? 'blue',
        createdAt: s.createdAt,
      });
      for (const c of s.chapters) {
        await db.chapters.put({
          id: c.id,
          subjectId: s.id,
          title: c.title,
          order: c.order,
        });
        for (const i of c.items) {
          await db.items.put({
            id: i.id,
            subjectId: s.id,
            chapterId: c.id,
            type: i.type,
            title: i.title,
            description: i.description,
            needsProof: i.needsProof,
            proofText: i.proofText,
            createdAt: i.createdAt,
          });
          for (const img of i.proofImages) {
            await db.proofImages.put({
              id: img.id,
              itemId: i.id,
              createdAt: img.createdAt,
              blob: dataUrlToBlob(img.dataUrl),
            });
          }
        }
      }
    }
  });
}

/** Import "leggero" (formato LLM) per una materia: crea una nuova materia. */
export async function importFromLLM(raw: unknown) {
  const data = (await import('./schema')).LLMImportSchema.parse(raw);

  await db.transaction('rw', db.subjects, db.chapters, db.items, async () => {
    for (const s of data.subjects) {
      const subjectId = uid();
      await db.subjects.add({
        id: subjectId,
        name: s.name,
        color: s.color === 'pink' ? 'pink' : 'blue',
        createdAt: Date.now(),
      });

      let order = 0;
      for (const c of s.chapters) {
        const chapterId = uid();
        await db.chapters.add({
          id: chapterId,
          subjectId,
          title: c.title,
          order: order++,
        });
        for (const i of c.items) {
          await db.items.add({
            id: uid(),
            subjectId,
            chapterId,
            type: i.type,
            title: i.title,
            description: i.description,
            needsProof: i.needsProof,
            proofText: i.proofText,
            createdAt: Date.now(),
          });
        }
      }
    }
  });
}