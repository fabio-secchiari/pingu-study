import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { notify } from '../lib/notify';
import { db } from '../db';
import { useMyUserId, UNAUTHORIZED } from '../lib/cloud';
import Penguin from './Penguin';

/** Mostra all'apertura il primo bigliettino non letto lasciato dall'altra persona. */
export default function NotePopup() {
  const me = useMyUserId();
  const note = useLiveQuery(
    () =>
      me === UNAUTHORIZED
        ? undefined
        : db.notes
            .orderBy('createdAt')
            .filter((n) => n.fromUserId !== me && !n.readBy.includes(me))
            .first(),
    [me]
  );
  const sender = useLiveQuery(
    () => (note ? db.profiles.where('userId').equals(note.fromUserId).first() : undefined),
    [note?.fromUserId]
  );

  // Notifica di sistema (una volta sola per bigliettino), utile se l'app è in background
  useEffect(() => {
    if (!note) return;
    const KEY = 'penguin-notified-notes';
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      /* ignore */
    }
    if (seen.includes(note.id)) return;
    notify(`💌 Bigliettino da ${note.fromName}`, note.text, 'note-' + note.id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...seen, note.id].slice(-50)));
    } catch {
      /* ignore */
    }
  }, [note]);

  if (!note) return null;
  const markRead = () => db.notes.update(note.id, { readBy: [...note.readBy, me] });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 text-center space-y-4 border-2 border-penguin-pink">
        <div className="relative w-28 mx-auto">
          <Penguin color={sender?.color ?? 'pink'} accessory={sender?.accessory ?? 'fiocco'} mood="love" className="w-28 h-32 anim-wobble" />
          <span className="absolute -right-4 bottom-6 text-4xl rotate-12" aria-hidden>
            💌
          </span>
        </div>
        <p className="text-sm text-ink/60">Un bigliettino da {note.fromName}</p>
        <p className="text-lg font-semibold whitespace-pre-wrap">{note.text}</p>
        <button onClick={markRead} className="px-6 py-3 rounded-2xl bg-penguin-pink text-white font-medium hover:bg-penguin-pink-dark">
          Letto ❤
        </button>
      </div>
    </div>
  );
}
