import type { AccessoryId } from '../types';

interface Props {
  color?: 'blue' | 'pink';
  accessory?: AccessoryId;
  mood?: 'happy' | 'sleepy' | 'sad' | 'love';
  className?: string;
  title?: string;
}

const PALETTE = {
  blue: { body: '#7BB8E8', wing: '#5A9BD4' },
  pink: { body: '#F8BBD0', wing: '#EC7FA9' },
};

/** Pinguino paffuto originale, con accessori sbloccabili. */
export default function Penguin({ color = 'blue', accessory = 'none', mood = 'happy', className, title }: Props) {
  const c = PALETTE[color];
  return (
    <svg viewBox="0 0 120 140" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <ellipse cx="60" cy="78" rx="50" ry="60" fill={c.body} />
      <ellipse cx="60" cy="95" rx="32" ry="40" fill="#FDFDFF" />
      <ellipse cx="14" cy="90" rx="10" ry="24" fill={c.wing} />
      <ellipse cx="106" cy="90" rx="10" ry="24" fill={c.wing} />
      <ellipse cx="44" cy="136" rx="12" ry="5" fill="#F4A261" />
      <ellipse cx="76" cy="136" rx="12" ry="5" fill="#F4A261" />

      {/* Occhi */}
      {mood === 'sleepy' ? (
        <g stroke="#1B2430" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M40 58 q6 5 12 0" />
          <path d="M68 58 q6 5 12 0" />
        </g>
      ) : mood === 'love' ? (
        <g fill="#EC4F8A">
          <path d="M46 63 l-6-6 a3.5 3.5 0 0 1 6-4 a3.5 3.5 0 0 1 6 4 z" />
          <path d="M74 63 l-6-6 a3.5 3.5 0 0 1 6-4 a3.5 3.5 0 0 1 6 4 z" />
        </g>
      ) : (
        <g>
          <circle cx="46" cy="58" r="6" fill="#1B2430" />
          <circle cx="74" cy="58" r="6" fill="#1B2430" />
          <circle cx="48" cy="56" r="2" fill="#fff" />
          <circle cx="76" cy="56" r="2" fill="#fff" />
          {mood === 'sad' && (
            <g stroke="#1B2430" strokeWidth="2.5" strokeLinecap="round">
              <path d="M38 48 l10 3" />
              <path d="M82 48 l-10 3" />
            </g>
          )}
        </g>
      )}
      <ellipse cx="60" cy="72" rx="8" ry="5" fill="#F4A261" />
      <circle cx="34" cy="74" r="8" fill="#F8BBD0" opacity="0.8" />
      <circle cx="86" cy="74" r="8" fill="#F8BBD0" opacity="0.8" />

      {/* Accessori */}
      {accessory === 'sciarpa' && (
        <g>
          <path d="M22 88 q38 16 76 0 v10 q-38 16 -76 0 z" fill="#E85D75" />
          <rect x="70" y="94" width="11" height="26" rx="4" fill="#E85D75" />
          <path d="M70 112 h11 M70 106 h11" stroke="#fff" strokeWidth="2" opacity="0.6" />
        </g>
      )}
      {accessory === 'occhiali' && (
        <g fill="none" stroke="#1B2430" strokeWidth="2.5">
          <circle cx="46" cy="58" r="10" />
          <circle cx="74" cy="58" r="10" />
          <path d="M56 58 h8" />
        </g>
      )}
      {accessory === 'cuffia' && (
        <g>
          <path d="M18 46 q42 -52 84 0 z" fill="#7C9CE0" />
          <rect x="16" y="40" width="88" height="12" rx="6" fill="#F3F6FF" />
          <circle cx="60" cy="8" r="9" fill="#F3F6FF" />
        </g>
      )}
      {accessory === 'fiocco' && (
        <g fill="#EC4F8A">
          <path d="M84 22 l-16 -10 v20 z" />
          <path d="M84 22 l16 -10 v20 z" />
          <circle cx="84" cy="22" r="5" fill="#C93A73" />
        </g>
      )}
      {accessory === 'corona' && (
        <path d="M38 26 l6 -18 l9 12 l7 -16 l7 16 l9 -12 l6 18 z" fill="#F5C542" stroke="#D9A21B" strokeWidth="1.5" />
      )}
      {accessory === 'tocco' && (
        <g>
          <path d="M60 2 l44 16 l-44 16 l-44 -16 z" fill="#1B2430" />
          <rect x="40" y="22" width="40" height="14" rx="3" fill="#1B2430" />
          <path d="M96 20 v22" stroke="#F5C542" strokeWidth="2.5" />
          <circle cx="96" cy="44" r="3.5" fill="#F5C542" />
        </g>
      )}
    </svg>
  );
}
