import { useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import { TYPE_COLORS, TYPE_LABELS, TYPE_VALUES, uid, type Item, type ItemType } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import MathText from './MathText';

interface Props {
  subjectId: string;
  chapterId: string;
  item: Item | null;
  onClose: () => void;
}

function BlobImage({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="" className="w-full h-40 object-cover rounded-xl border" />;
}

export default function ItemModal({ subjectId, chapterId, item, onClose }: Props) {
  const isNew = !item;
  const [draft, setDraft] = useState<Item>(
    item ?? {
      id: uid(),
      subjectId,
      chapterId,
      type: 'definizione',
      title: '',
      description: '',
      needsProof: false,
      createdAt: Date.now(),
    }
  );
  const [proofText, setProofText] = useState(item?.proofText ?? '');

  const images = useLiveQuery(
    () => (isNew ? [] : db.proofImages.where('itemId').equals(item!.id).toArray()),
    [item?.id]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    const payload = { ...draft, proofText };
    if (isNew) await db.items.add(payload);
    else await db.items.put(payload);
    onClose();
  };

  const remove = async () => {
    if (!item) return;
    if (!confirm('Eliminare questo elemento?')) return;
    await db.items.delete(item.id);
    await db.proofImages.where('itemId').equals(item.id).delete();
    onClose();
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      await db.proofImages.add({ id: uid(), itemId: draft.id, blob: f, createdAt: Date.now() });
    }
  };

  const removeImage = async (id: string) => {
    await db.proofImages.delete(id);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-stretch sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-h-full sm:max-w-2xl sm:rounded-3xl shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 bg-white">
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold ${TYPE_COLORS[draft.type]}`}
          >
            {TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="w-10 h-10 -mr-2 rounded-full text-ink/50 hover:text-ink hover:bg-ink/5 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4">

          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Titolo (es. Teorema di Weierstrass)"
            className="w-full px-4 py-3 rounded-2xl bg-penguin-blue-soft/50 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue font-semibold"
          />

          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Descrizione / significato…"
            rows={4}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue resize-none"
          />
          {draft.description && (
            <div className="p-3 rounded-2xl bg-penguin-blue-soft/40 border border-penguin-blue-soft text-sm">
                <MathText as="div">{draft.description}</MathText>
            </div>
            )}

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
              <textarea
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="Dimostrazione (testo)…"
                rows={5}
                className="w-full px-3 py-2 rounded-xl bg-white border border-penguin-pink/40 focus:outline-none focus:ring-2 focus:ring-penguin-pink resize-none"
              />
              {proofText && (
                <div className="p-3 rounded-2xl bg-white border border-penguin-pink/40 text-sm">
                    <MathText as="div">{proofText}</MathText>
                </div>
                )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Foto della dimostrazione
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => addFiles(e.target.files)}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-penguin-pink file:text-white file:font-medium hover:file:bg-penguin-pink-dark"
                />
              </div>

              {images && images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative">
                      <BlobImage blob={img.blob} />
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-white/90 rounded-full w-7 h-7 text-ink/70 hover:text-red-600"
                        title="Rimuovi"
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
            <button
              onClick={remove}
              className="px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 text-sm font-medium"
            >
              Elimina
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-4 py-3 rounded-2xl text-ink/70 hover:bg-ink/5 text-sm">
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