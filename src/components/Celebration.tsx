import { useEffect, useState } from 'react';
import Penguin from './Penguin';

const EVENT = 'penguin-celebrate';

/** Lancia coriandoli + pinguino che scivola sulla pancia. */
export function celebrate(message = 'Evviva!') {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

const COLORS = ['#7BB8E8', '#F8BBD0', '#EC7FA9', '#5A9BD4', '#F5C542', '#9FE1CB'];

export default function Celebration() {
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const on = (e: Event) => {
      setMsg((e as CustomEvent).detail);
      setKey((k) => k + 1);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4200);
    return () => clearTimeout(t);
  }, [msg, key]);

  if (!msg) return null;
  return (
    <div key={key} className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-live="polite">
      {Array.from({ length: 70 }, (_, i) => (
        <span
          key={i}
          className="anim-confetti absolute top-0 block w-2 h-3 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animation: `confetti-fall ${2.2 + ((i * 13) % 20) / 10}s linear ${((i * 7) % 15) / 10}s forwards`,
          }}
        />
      ))}
      <div
        className="anim-slide absolute bottom-24 left-0 w-24"
        style={{ animation: 'penguin-slide 3.2s ease-in-out forwards' }}
      >
        <Penguin color="pink" mood="love" />
      </div>
      <div className="absolute inset-x-0 top-1/3 flex justify-center">
        <div className="px-6 py-4 rounded-3xl bg-white/95 shadow-xl text-xl font-bold text-center border border-penguin-pink">
          {msg}
        </div>
      </div>
    </div>
  );
}
