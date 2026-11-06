import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { db } from '../db';
import { STATUS_DOT, STATUS_LABELS, STATUS_VALUES, type Item, type StudyStatus } from '../types';
import { statusOf } from '../lib/srs';

interface Props {
  item: Item;
  x: number;
  y: number;
  onOpen: () => void;
  onClose: () => void;
}

const HINT: Record<StudyStatus, string> = {
  'da-studiare': 'torna subito nel ripasso',
  ripassato: 'l’hai già visto',
  padroneggiato: 'lo sai benissimo',
};

/** Menu contestuale (tasto destro o tocco sul pallino) per cambiare lo stato di studio. */
export default function StatusMenu({ item, x, y, onOpen, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const current = statusOf(item);

  // Tieni il menu dentro lo schermo
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
    el.querySelector<HTMLButtonElement>('[data-current="true"]')?.focus();
  }, [x, y]);

  useEffect(() => {
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const choose = async (status: StudyStatus) => {
    // "Da studiare" lo rimette subito tra le carte del ripasso
    await db.items.update(item.id, status === 'da-studiare' ? { status, dueAt: Date.now() } : { status });
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Stato di studio"
      className="fixed z-50 w-60 p-1.5 rounded-2xl bg-white shadow-xl border border-penguin-blue-soft"
      style={pos}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="px-2.5 pt-1 pb-1.5 text-[11px] text-ink/50 truncate">{item.title}</p>
      {STATUS_VALUES.map((s) => (
        <button
          key={s}
          role="menuitemradio"
          aria-checked={s === current}
          data-current={s === current}
          onClick={() => choose(s)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-sm hover:bg-penguin-blue-soft focus:bg-penguin-blue-soft focus:outline-none ${
            s === current ? 'font-semibold' : ''
          }`}
        >
          <span className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
          <span className="flex-1">
            {STATUS_LABELS[s]}
            <span className="block text-[11px] font-normal text-ink/50">{HINT[s]}</span>
          </span>
          {s === current && <span aria-hidden>✓</span>}
        </button>
      ))}
      <div className="my-1 h-px bg-ink/5" />
      <button
        role="menuitem"
        onClick={() => {
          onClose();
          onOpen();
        }}
        className="w-full px-2.5 py-2 rounded-xl text-left text-sm hover:bg-penguin-blue-soft focus:bg-penguin-blue-soft focus:outline-none"
      >
        Apri la scheda
      </button>
    </div>
  );
}
