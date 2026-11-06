import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import {
  STATUS_DOT,
  STATUS_LABELS,
  STATUS_VALUES,
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_VALUES,
  uid,
  type Item,
  type ItemType,
  type StudyStatus,
} from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import MathEditor from './editor/MathEditor';
import { compressImage } from '../lib/images';
import { realmPatch } from '../lib/cloud';
import { PomodoroChip } from './PomodoroBar';

interface Props {
  subjectId: string;
  subjectRealmId?: string;
  chapterId: string;
  item: Item | null;
  onClose: () => void;
}

function BlobImage({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Foto della dimostrazione" className="w-full h-40 object-cover rounded-xl border" />
    </a>
  );
}

export default function ItemModal({ subjectId, subjectRealmId, chapterId, item, onClose }: Props) {
  const isNew = !item;
  const [draft, setDraft] = useState<Item>(
    () =>
      item ?? {
        id: uid(),
        subjectId,
        chapterId,
        type: 'definizione',
        title: '',
        description: '',
        needsProof: false,
        createdAt: Date.now(),
        order: Date.now(),
        status: 'da-studiare',
        ...realmPatch(subjectRealmId),
      }
  );
  const [proofText, setProofText] = useState(item?.proofText ?? '');
  const [busy, setBusy] = useState(false);

  // Le foto si possono aggiungere anche su un elemento nuovo (sono legate al suo id)
  const images = useLiveQuery(() => db.proofImages.where('itemId').equals(draft.id).toArray(), [draft.id]);

  const save = useCallback(async () => {
    if (!draft.title.trim()) return;
    const payload = { ...draft, title: draft.title.trim(), proofText };
    await db.items.put(payload);
    onClose();
  }, [draft, proofText, onClose]);

  const cancel = useCallback(async () => {
    // Elemento nuovo mai salvato: elimina le foto caricate nel frattempo
    if (isNew && !(await db.items.get(draft.id))) {
      await db.proofImages.where('itemId').equals(draft.id).delete();
    }
    onClose();
  }, [isNew, draft.id, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancel]);

  const remove = async () => {
    if (!item) return;
    if (!confirm('Eliminare questo elemento?')) return;
    await db.items.delete(item.id);
    await db.proofImages.where('itemId').equals(item.id).delete();
    onClose();
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        const blob = await compressImage(f);
        await db.proofImages.add({
          id: uid(),
          itemId: draft.id,
          blob,
          createdAt: Date.now(),
          ...realmPatch(subjectRealmId),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Nuovo elemento' : draft.title}
    >
      <div className="bg-white w-full max-h-full sm:max-w-3xl sm:rounded-3xl shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold ${TYPE_COLORS[draft.type]}`}
              aria-label="Tipo"
            >
              {TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[draft.status ?? 'da-studiare']}`} />
              <select
                value={draft.status ?? 'da-studiare'}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as StudyStatus })}
                className="bg-transparent focus:outline-none"
                aria-label="Stato di studio"
              >
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <PomodoroChip />
          <button
            onClick={cancel}
            aria-label="Chiudi"
            className="w-10 h-10 -mr-2 rounded-full text-ink/50 hover:text-ink hover:bg-ink/5 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* pt-1: lascia spazio all'anello di focus del titolo sotto l'header sticky */}
        <div className="px-5 sm:px-6 pt-1 pb-5 sm:pb-6 space-y-4">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && save()}
            placeholder="Titolo (es. Teorema di Weierstrass)"
            aria-label="Titolo"
            className="w-full px-4 py-3 rounded-2xl bg-penguin-blue-soft/50 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue font-semibold"
          />

          <MathEditor
            value={draft.description}
            onChange={(description) => setDraft((d) => ({ ...d, description }))}
            placeholder="Enunciato / significato… (Invio = a capo, ⌘+Invio = salva)"
            label="Descrizione"
            onSubmit={save}
            minHeight={140}
          />

          <label className="flex items-center gap-3 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={draft.needsProof}
              onChange={(e) => setDraft({ ...draft, needsProof: e.target.checked })}
              className="w-5 h-5 accent-penguin-pink-dark"
            />
            <span className="text-sm">Serve studiarne la dimostrazione</span>
          </label>

          {draft.needsProof && (
            <div className="space-y-3 p-4 rounded-2xl bg-penguin-pink-soft/60 border border-penguin-pink/50">
              <MathEditor
                value={proofText}
                onChange={setProofText}
                placeholder="Dimostrazione…"
                label="Dimostrazione"
                onSubmit={save}
                tone="pink"
                minHeight={160}
              />

              <div>
                <label className="block text-sm font-medium mb-2">Foto della dimostrazione</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => addFiles(e.target.files)}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-penguin-pink file:text-white file:font-medium hover:file:bg-penguin-pink-dark"
                />
                {busy && <p className="text-xs text-ink/50 mt-1">Comprimo le foto…</p>}
              </div>

              {images && images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative">
                      <BlobImage blob={img.blob} />
                      <button
                        onClick={() => db.proofImages.delete(img.id)}
                        className="absolute top-1 right-1 bg-white/90 rounded-full w-7 h-7 text-ink/70 hover:text-red-600"
                        title="Rimuovi"
                        aria-label="Rimuovi foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 p-4 bg-white/95 border-t border-penguin-blue-soft">
          {!isNew && (
            <button onClick={remove} className="px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 text-sm font-medium">
              Elimina
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={cancel} className="px-4 py-3 rounded-2xl text-ink/70 hover:bg-ink/5 text-sm">
              Annulla
            </button>
            <button
              onClick={save}
              disabled={!draft.title.trim()}
              className="px-5 py-3 rounded-2xl bg-penguin-blue text-white font-medium disabled:opacity-40 hover:bg-penguin-blue-dark"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
