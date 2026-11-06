import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TYPE_LABELS, type ProofImage } from '../types';
import Markdown from '../components/Markdown';
import MathText from '../components/MathText';

function Images({ images }: { images: ProofImage[] }) {
  const urls = useMemo(() => images.map((i) => URL.createObjectURL(i.blob)), [images]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {urls.map((u) => (
        <img key={u} src={u} alt="" className="rounded border w-full print-break" />
      ))}
    </div>
  );
}

/** Versione stampabile: dal browser "Stampa → Salva come PDF". */
export default function PrintPage() {
  const { id = '' } = useParams();
  const subject = useLiveQuery(() => db.subjects.get(id), [id]);
  const chapters = useLiveQuery(() => db.chapters.where('subjectId').equals(id).sortBy('order'), [id]);
  const items = useLiveQuery(() => db.items.where('subjectId').equals(id).toArray(), [id]);
  const images = useLiveQuery(async () => {
    const ids = (await db.items.where('subjectId').equals(id).primaryKeys()) as string[];
    return db.proofImages.where('itemId').anyOf(ids).toArray();
  }, [id]);

  if (!subject || !chapters || !items) return <p>Caricamento…</p>;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 print:p-0 print:rounded-none">
      <div className="no-print flex gap-2 mb-6">
        <Link to={`/subject/${id}`} className="px-3 py-2 rounded-xl bg-penguin-blue-soft text-sm">
          ← Torna alla materia
        </Link>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-penguin-blue text-white text-sm font-medium">
          🖨️ Stampa / Salva PDF
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-6">{subject.name}</h1>
      {chapters.map((ch) => (
        <section key={ch.id} className="mb-8">
          <h2 className="text-xl font-bold border-b-2 border-penguin-blue pb-1 mb-3">{ch.title}</h2>
          {items
            .filter((i) => i.chapterId === ch.id)
            .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
            .map((it) => (
              <article key={it.id} className="mb-5 print-break">
                <h3 className="font-semibold">
                  <span className="text-penguin-blue-dark">{TYPE_LABELS[it.type]}</span> ·{' '}
                  <MathText>{it.title}</MathText>
                </h3>
                {it.description && <Markdown className="mt-1">{it.description}</Markdown>}
                {it.needsProof && (it.proofText || images?.some((im) => im.itemId === it.id)) && (
                  <div className="mt-2 pl-3 border-l-2 border-penguin-pink">
                    <p className="text-sm font-semibold italic">Dimostrazione</p>
                    {it.proofText && <Markdown>{it.proofText}</Markdown>}
                    <Images images={(images ?? []).filter((im) => im.itemId === it.id)} />
                  </div>
                )}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
