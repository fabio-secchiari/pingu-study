import { cosmeticsOf, type AccessoryId, type Cosmetics } from '../types';

interface Props {
  color?: 'blue' | 'pink';
  /** Cosmetici per slot (testa, viso, collo, pinna) */
  cosmetics?: Cosmetics;
  /** Scorciatoia per un singolo accessorio (vecchio formato) */
  accessory?: AccessoryId;
  mood?: 'happy' | 'sleepy' | 'sad' | 'love';
  className?: string;
  title?: string;
}

const PALETTE = {
  blue: { body: '#7BB8E8', wing: '#5A9BD4' },
  pink: { body: '#F8BBD0', wing: '#EC7FA9' },
};

const INK = '#1B2430';

function Head({ id }: { id?: string }) {
  switch (id) {
    case 'orecchie':
      return (
        <g>
          <ellipse cx="44" cy="2" rx="8" ry="22" fill="#fff" stroke="#e6dce3" strokeWidth="1.5" transform="rotate(-12 44 2)" />
          <ellipse cx="44" cy="4" rx="4" ry="15" fill="#F8BBD0" transform="rotate(-12 44 4)" />
          <ellipse cx="76" cy="2" rx="8" ry="22" fill="#fff" stroke="#e6dce3" strokeWidth="1.5" transform="rotate(12 76 2)" />
          <ellipse cx="76" cy="4" rx="4" ry="15" fill="#F8BBD0" transform="rotate(12 76 4)" />
        </g>
      );
    case 'cappellino':
      return (
        <g>
          <path d="M26 36 q34 -40 68 0 z" fill="#F4A261" />
          <path d="M60 33 q30 -2 50 8 q-20 6 -50 0 z" fill="#E08A43" />
          <circle cx="60" cy="10" r="3.5" fill="#E08A43" />
        </g>
      );
    case 'fiocco':
      return (
        <g fill="#EC4F8A">
          <path d="M84 22 l-16 -10 v20 z" />
          <path d="M84 22 l16 -10 v20 z" />
          <circle cx="84" cy="22" r="5" fill="#C93A73" />
        </g>
      );
    case 'fiori':
      return (
        <g>
          <path d="M24 34 q36 -22 72 0" fill="none" stroke="#6BAF6B" strokeWidth="3" />
          {[
            [28, 31, '#F8BBD0'],
            [42, 24, '#FFF1B8'],
            [60, 21, '#EC7FA9'],
            [78, 24, '#FFF1B8'],
            [92, 31, '#F8BBD0'],
          ].map(([x, y, c], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={(x as number) + 4 * Math.cos((a * Math.PI) / 180)} cy={(y as number) + 4 * Math.sin((a * Math.PI) / 180)} r="3.2" fill={c as string} />
              ))}
              <circle cx={x as number} cy={y as number} r="2.2" fill="#F5C542" />
            </g>
          ))}
        </g>
      );
    case 'cuffia':
      return (
        <g>
          <path d="M18 46 q42 -52 84 0 z" fill="#7C9CE0" />
          <rect x="16" y="40" width="88" height="12" rx="6" fill="#F3F6FF" />
          <circle cx="60" cy="8" r="9" fill="#F3F6FF" />
        </g>
      );
    case 'cuffie':
      return (
        <g>
          <path d="M16 62 q0 -54 44 -54 q44 0 44 54" fill="none" stroke={INK} strokeWidth="5" />
          <rect x="6" y="54" width="16" height="24" rx="7" fill="#EC7FA9" />
          <rect x="98" y="54" width="16" height="24" rx="7" fill="#EC7FA9" />
        </g>
      );
    case 'aureola':
      return <ellipse cx="60" cy="4" rx="26" ry="7" fill="none" stroke="#F5C542" strokeWidth="5" />;
    case 'natale':
      return (
        <g>
          <path d="M22 40 q30 -50 70 -26 q14 8 18 26 z" fill="#E04848" />
          <rect x="18" y="36" width="84" height="11" rx="5.5" fill="#fff" />
          <circle cx="110" cy="38" r="7" fill="#fff" />
        </g>
      );
    case 'mago':
      return (
        <g>
          <path d="M30 38 L62 -24 L90 38 z" fill="#7F77DD" />
          <ellipse cx="60" cy="38" rx="38" ry="7" fill="#534AB7" />
          <path d="M56 4 l2 5 l5 0 l-4 3 l2 5 l-5 -3 l-5 3 l2 -5 l-4 -3 l5 0 z" fill="#F5C542" />
          <circle cx="72" cy="18" r="2" fill="#F5C542" />
        </g>
      );
    case 'corona':
      return <path d="M38 26 l6 -18 l9 12 l7 -16 l7 16 l9 -12 l6 18 z" fill="#F5C542" stroke="#D9A21B" strokeWidth="1.5" />;
    case 'tocco':
      return (
        <g>
          <path d="M60 2 l44 16 l-44 16 l-44 -16 z" fill={INK} />
          <rect x="40" y="22" width="40" height="14" rx="3" fill={INK} />
          <path d="M96 20 v22" stroke="#F5C542" strokeWidth="2.5" />
          <circle cx="96" cy="44" r="3.5" fill="#F5C542" />
        </g>
      );
    default:
      return null;
  }
}

function Face({ id }: { id?: string }) {
  switch (id) {
    case 'guance':
      return (
        <g fill="#EC4F8A" opacity="0.85">
          <path d="M34 80 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z" />
          <path d="M86 80 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z" />
        </g>
      );
    case 'occhiali':
      return (
        <g fill="none" stroke={INK} strokeWidth="2.5">
          <circle cx="46" cy="58" r="10" />
          <circle cx="74" cy="58" r="10" />
          <path d="M56 58 h8" />
        </g>
      );
    case 'sole':
      return (
        <g>
          <path d="M33 52 h26 v6 q0 9 -13 9 q-13 0 -13 -9 z" fill={INK} />
          <path d="M61 52 h26 v6 q0 9 -13 9 q-13 0 -13 -9 z" fill={INK} />
          <path d="M59 54 h2" stroke={INK} strokeWidth="3" />
          <path d="M38 55 l5 0" stroke="#fff" strokeWidth="2" opacity="0.6" />
          <path d="M66 55 l5 0" stroke="#fff" strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 'monocolo':
      return (
        <g fill="none" stroke="#D9A21B" strokeWidth="2.5">
          <circle cx="74" cy="58" r="10" />
          <path d="M84 62 q6 16 -2 30" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

function Neck({ id }: { id?: string }) {
  switch (id) {
    case 'sciarpa':
      return (
        <g>
          <path d="M22 88 q38 16 76 0 v10 q-38 16 -76 0 z" fill="#E85D75" />
          <rect x="70" y="94" width="11" height="26" rx="4" fill="#E85D75" />
          <path d="M70 112 h11 M70 106 h11" stroke="#fff" strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 'papillon':
      return (
        <g fill="#5A9BD4">
          <path d="M60 92 l-14 -8 v16 z" />
          <path d="M60 92 l14 -8 v16 z" />
          <circle cx="60" cy="92" r="4" fill="#3E7DB8" />
        </g>
      );
    case 'campanello':
      return (
        <g>
          <path d="M30 88 q30 12 60 0" fill="none" stroke="#E85D75" strokeWidth="4" />
          <circle cx="60" cy="99" r="7" fill="#F5C542" stroke="#D9A21B" strokeWidth="1.5" />
          <path d="M56 101 h8" stroke="#D9A21B" strokeWidth="1.5" />
        </g>
      );
    case 'perle':
      return (
        <g fill="#FFFDF6" stroke="#e8e0cf" strokeWidth="0.8">
          {Array.from({ length: 11 }, (_, i) => {
            const t = i / 10;
            const x = 30 + t * 60;
            const y = 88 + Math.sin(t * Math.PI) * 10;
            return <circle key={i} cx={x} cy={y} r="3.3" />;
          })}
        </g>
      );
    case 'medaglia':
      return (
        <g>
          <path d="M44 86 l12 18 M76 86 l-12 18" stroke="#5A9BD4" strokeWidth="5" />
          <circle cx="60" cy="110" r="9" fill="#F5C542" stroke="#D9A21B" strokeWidth="2" />
          <path d="M60 104 l2 4 l4 0 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 l4 0 z" fill="#D9A21B" />
        </g>
      );
    default:
      return null;
  }
}

function Flipper({ id }: { id?: string }) {
  switch (id) {
    case 'pesce':
      return (
        <g transform="translate(104 88) rotate(-20)">
          <ellipse cx="10" cy="0" rx="11" ry="6" fill="#7BB8E8" />
          <path d="M20 0 l8 -6 v12 z" fill="#5A9BD4" />
          <circle cx="5" cy="-1" r="1.5" fill={INK} />
        </g>
      );
    case 'libro':
      return (
        <g transform="translate(98 84) rotate(-10)">
          <rect x="0" y="0" width="22" height="28" rx="2" fill="#E85D75" />
          <rect x="3" y="3" width="16" height="22" rx="1" fill="#fff" opacity="0.25" />
          <text x="11" y="18" fontSize="10" textAnchor="middle" fill="#fff" fontFamily="serif">∫</text>
        </g>
      );
    case 'matita':
      return (
        <g transform="translate(100 74) rotate(25)">
          <rect x="0" y="0" width="6" height="32" fill="#F5C542" />
          <path d="M0 32 l3 8 l3 -8 z" fill="#F4D9B0" />
          <path d="M2 38 l1 2 l1 -2 z" fill={INK} />
          <rect x="0" y="-4" width="6" height="5" fill="#EC7FA9" />
        </g>
      );
    case 'tazza':
      return (
        <g transform="translate(98 92)">
          <path d="M0 0 h18 v14 q0 6 -6 6 h-6 q-6 0 -6 -6 z" fill="#fff" stroke="#c9d6e3" strokeWidth="1.2" />
          <path d="M18 4 q7 0 7 6 q0 6 -7 5" fill="none" stroke="#c9d6e3" strokeWidth="2.5" />
          <ellipse cx="9" cy="2" rx="8" ry="2" fill="#8B5A3C" />
          <path d="M6 -4 q2 -4 0 -8 M12 -4 q2 -4 0 -8" stroke="#c9d6e3" strokeWidth="1.5" fill="none" />
        </g>
      );
    case 'palloncino':
      return (
        <g>
          <path d="M110 92 q4 -30 -2 -56" stroke="#9aa8b8" strokeWidth="1.2" fill="none" />
          <path d="M108 36 l-14 -14 a9 9 0 0 1 14 -10 a9 9 0 0 1 14 10 z" fill="#EC4F8A" />
          <path d="M100 16 q2 -3 5 -3" stroke="#fff" strokeWidth="2" opacity="0.6" fill="none" />
        </g>
      );
    case 'rosa':
      return (
        <g transform="translate(104 70)">
          <path d="M4 30 q2 -16 0 -24" stroke="#4E9A57" strokeWidth="2.5" fill="none" />
          <path d="M4 18 q6 -4 9 0 q-5 3 -9 0" fill="#6BAF6B" />
          <circle cx="4" cy="4" r="7" fill="#E04868" />
          <path d="M1 3 q3 -4 6 0 q-3 3 -6 0" fill="#B8304E" />
        </g>
      );
    default:
      return null;
  }
}

/** Pinguino paffuto originale, con cosmetici combinabili. */
export default function Penguin({ color = 'blue', cosmetics, accessory, mood = 'happy', className, title }: Props) {
  const c = PALETTE[color];
  const look = cosmetics ?? cosmeticsOf({ accessory });
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      style={{ overflow: 'visible' }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {look.testa === 'cuffie' && <Head id="cuffie" />}
      <ellipse cx="60" cy="78" rx="50" ry="60" fill={c.body} />
      <ellipse cx="60" cy="95" rx="32" ry="40" fill="#FDFDFF" />
      <ellipse cx="14" cy="90" rx="10" ry="24" fill={c.wing} />
      <ellipse cx="44" cy="136" rx="12" ry="5" fill="#F4A261" />
      <ellipse cx="76" cy="136" rx="12" ry="5" fill="#F4A261" />

      {mood === 'sleepy' ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
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
          <circle cx="46" cy="58" r="6" fill={INK} />
          <circle cx="74" cy="58" r="6" fill={INK} />
          <circle cx="48" cy="56" r="2" fill="#fff" />
          <circle cx="76" cy="56" r="2" fill="#fff" />
          {mood === 'sad' && (
            <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
              <path d="M38 48 l10 3" />
              <path d="M82 48 l-10 3" />
            </g>
          )}
        </g>
      )}
      <ellipse cx="60" cy="72" rx="8" ry="5" fill="#F4A261" />
      {look.viso !== 'guance' && (
        <>
          <circle cx="34" cy="74" r="8" fill="#F8BBD0" opacity="0.8" />
          <circle cx="86" cy="74" r="8" fill="#F8BBD0" opacity="0.8" />
        </>
      )}

      <Neck id={look.collo} />
      <Face id={look.viso} />
      {look.testa !== 'cuffie' && <Head id={look.testa} />}
      <ellipse cx="106" cy="90" rx="10" ry="24" fill={c.wing} />
      <Flipper id={look.pinna} />
    </svg>
  );
}
