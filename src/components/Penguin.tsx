import { cosmeticsOf, type AccessoryId, type Cosmetics } from '../types';

interface Props {
  color?: 'blue' | 'pink';
  /** Cosmetici per slot (testa, viso, collo, pinna destra e sinistra) */
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

/** Stella a 5 punte centrata in (cx, cy). */
function starPath(cx: number, cy: number, R: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return `${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
}

/** Cose in testa che passano DIETRO la testa (archetti di cuffie e paraorecchie). */
const BEHIND_HEAD = new Set(['cuffie', 'paraorecchie']);

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
    case 'corna':
      return (
        <g stroke="#8B5A3C" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M44 28 q-4 -14 -14 -22 M34 12 l-10 -2 M38 18 q-2 -8 4 -14" />
          <path d="M76 28 q4 -14 14 -22 M86 12 l10 -2 M82 18 q2 -8 -4 -14" />
        </g>
      );
    case 'cowboy':
      return (
        <g>
          <ellipse cx="60" cy="34" rx="46" ry="7" fill="#A0673A" />
          <path d="M36 34 q0 -28 12 -28 q12 7 24 0 q12 0 12 28 z" fill="#B87A45" />
          <rect x="36" y="25" width="48" height="5" fill="#6B3E1F" />
        </g>
      );
    case 'cilindro':
      return (
        <g>
          <rect x="40" y="-6" width="40" height="40" rx="3" fill={INK} />
          <rect x="40" y="23" width="40" height="6" fill="#E85D75" />
          <ellipse cx="60" cy="34" rx="34" ry="5" fill={INK} />
        </g>
      );
    case 'elmetto':
      return (
        <g>
          <path d="M24 38 q0 -32 36 -32 q36 0 36 32 z" fill="#F5C542" />
          <rect x="56" y="6" width="8" height="30" rx="3" fill="#E0AE1E" />
          <rect x="16" y="34" width="88" height="7" rx="3.5" fill="#E0AE1E" />
        </g>
      );
    case 'chef':
      return (
        <g fill="#fff" stroke="#dfe5ee" strokeWidth="1.5">
          <circle cx="42" cy="10" r="12" />
          <circle cx="78" cy="10" r="12" />
          <circle cx="60" cy="2" r="14" />
          <rect x="36" y="14" width="48" height="22" rx="4" />
        </g>
      );
    case 'paraorecchie':
      return (
        <g>
          <path d="M16 60 q0 -56 44 -56 q44 0 44 56" fill="none" stroke="#E85D75" strokeWidth="4" />
          <circle cx="14" cy="60" r="11" fill="#fff" stroke="#F8BBD0" strokeWidth="4" strokeDasharray="3 2" />
          <circle cx="106" cy="60" r="11" fill="#fff" stroke="#F8BBD0" strokeWidth="4" strokeDasharray="3 2" />
        </g>
      );
    case 'agrifoglio':
      return (
        <g transform="translate(80 26) rotate(-15)">
          <path d="M0 0 q-8 -10 -18 -6 q4 2 2 6 q4 0 4 4 q6 -2 12 -4 z" fill="#2E8B57" />
          <path d="M0 0 q8 -10 18 -6 q-4 2 -2 6 q-4 0 -4 4 q-6 -2 -12 -4 z" fill="#3BA36B" />
          <circle cx="-3" cy="-2" r="3.5" fill="#E04848" />
          <circle cx="3" cy="-3" r="3.5" fill="#E04848" />
          <circle cx="0" cy="3" r="3.5" fill="#C93A3A" />
        </g>
      );
    case 'stella':
      return <path d={starPath(60, 2, 15, 6.5)} fill="#F5C542" stroke="#D9A21B" strokeWidth="1.5" strokeLinejoin="round" />;
    case 'pirata':
      return (
        <g>
          <path d="M14 38 q46 -58 92 0 q-46 -12 -92 0 z" fill={INK} />
          <circle cx="60" cy="18" r="5" fill="#fff" />
          <path d="M53 26 l14 4 M67 26 l-14 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="58" cy="17.5" r="1.2" fill={INK} />
          <circle cx="62" cy="17.5" r="1.2" fill={INK} />
        </g>
      );
    case 'fascia':
      return (
        <g>
          <path d="M22 41 q38 -14 76 0 v-10 q-38 -14 -76 0 z" fill="#EC4F8A" />
          <path d="M22 36 q38 -14 76 0" stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      );
    case 'elfo':
      return (
        <g>
          <path d="M22 40 Q40 -2 80 6 Q102 12 114 26 Q96 22 94 40 Z" fill="#3BA36B" />
          <rect x="18" y="35" width="84" height="10" rx="5" fill="#E04848" />
          <circle cx="114" cy="27" r="5" fill="#F5C542" stroke="#D9A21B" strokeWidth="1" />
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
    case 'nasorosso':
      return (
        <g>
          <circle cx="60" cy="71" r="7.5" fill="#E04848" />
          <circle cx="57.5" cy="68.5" r="2" fill="#fff" opacity="0.7" />
        </g>
      );
    case 'baffi':
      return (
        <path
          d="M60 76 q-8 -6 -16 0 q-6 4 -10 -2 q2 9 12 8 q8 -1 14 -5 q6 4 14 5 q10 1 12 -8 q-4 6 -10 2 q-8 -6 -16 0 z"
          fill="#5A3B2A"
        />
      );
    case 'cuori':
      return (
        <g>
          <path d="M46 67 l-11 -10 a6 6 0 0 1 11 -8 a6 6 0 0 1 11 8 z" fill="#EC4F8A" stroke="#C93A73" strokeWidth="1.5" opacity="0.9" />
          <path d="M74 67 l-11 -10 a6 6 0 0 1 11 -8 a6 6 0 0 1 11 8 z" fill="#EC4F8A" stroke="#C93A73" strokeWidth="1.5" opacity="0.9" />
          <path d="M57 56 h6" stroke="#C93A73" strokeWidth="2" />
        </g>
      );
    case 'benda':
      return (
        <g>
          <path d="M18 46 L100 64" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="74" cy="59" rx="10" ry="9" fill={INK} />
        </g>
      );
    case 'barba':
      return (
        <path
          d="M28 74 q4 34 32 38 q28 -4 32 -38 q-8 10 -16 6 q-6 6 -16 2 q-10 4 -16 -2 q-8 4 -16 -6 z"
          fill="#fff"
          stroke="#aebccb"
          strokeWidth="2"
        />
      );
    case 'maschera':
      return (
        <g>
          <rect x="12" y="53" width="96" height="7" rx="3" fill="#5A9BD4" />
          <rect x="31" y="47" width="58" height="22" rx="11" fill="#F4A261" stroke={INK} strokeWidth="2.5" />
          <path d="M38 53 q6 -3 12 0" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.7" />
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
    case 'cravatta':
      return (
        <g>
          <path d="M44 85 l16 5 l-8 8 z M76 85 l-16 5 l8 8 z" fill="#fff" stroke="#dfe5ee" strokeWidth="1" />
          <path d="M55 88 h10 l-2 7 h-6 z" fill="#3E5BA8" />
          <path d="M57 95 h6 l5 22 l-8 8 l-8 -8 z" fill="#4A6FC9" />
          <path d="M55 104 l10 -4 M54 111 l12 -5" stroke="#F5C542" strokeWidth="1.5" />
        </g>
      );
    case 'lucine':
      return (
        <g>
          <path d="M24 88 q36 18 72 0" fill="none" stroke="#2E6B3A" strokeWidth="2" />
          {['#E04848', '#F5C542', '#5A9BD4', '#3BA36B', '#EC4F8A', '#F4A261', '#7F77DD'].map((col, i) => {
            const t = (i + 0.5) / 7;
            const x = 24 + 72 * t;
            const y = 88 * (1 - t) ** 2 + 2 * (1 - t) * t * 106 + 88 * t * t;
            return <ellipse key={i} cx={x} cy={y + 4} rx="3" ry="4.5" fill={col} transform={`rotate(${(t - 0.5) * -50} ${x} ${y})`} />;
          })}
        </g>
      );
    case 'sciarpaNatale':
      return (
        <g>
          <path d="M22 88 q38 16 76 0 v10 q-38 16 -76 0 z" fill="#C93A3A" />
          {[32, 46, 60, 74, 88].map((x) => {
            const t = (x - 22) / 76;
            const y = 88 + 32 * t * (1 - t);
            return <rect key={x} x={x - 2.5} y={y} width="5" height="10" fill="#fff" />;
          })}
          <rect x="70" y="94" width="11" height="26" rx="4" fill="#C93A3A" />
          <path d="M70 104 h11 M70 112 h11" stroke="#3BA36B" strokeWidth="3" />
        </g>
      );
    case 'stetoscopio':
      return (
        <g fill="none" stroke="#4a5866" strokeWidth="3" strokeLinecap="round">
          <path d="M38 84 q2 18 22 22 q20 -4 22 -22" />
          <path d="M60 106 v8" />
          <circle cx="60" cy="119" r="6" fill="#c9d6e3" strokeWidth="2" />
        </g>
      );
    case 'collanafiori':
      return (
        <g>
          {Array.from({ length: 7 }, (_, i) => {
            const t = i / 6;
            const x = 26 + 68 * t;
            const y = 88 * (1 - t) ** 2 + 2 * (1 - t) * t * 110 + 88 * t * t;
            const col = ['#EC7FA9', '#FFF1B8', '#B9A7F0'][i % 3];
            return (
              <g key={i}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <circle key={a} cx={x + 4 * Math.cos((a * Math.PI) / 180)} cy={y + 4 * Math.sin((a * Math.PI) / 180)} r="3.4" fill={col} />
                ))}
                <circle cx={x} cy={y} r="2.2" fill="#F5C542" />
              </g>
            );
          })}
        </g>
      );
    case 'bandana':
      return (
        <g>
          <path d="M26 86 q34 14 68 0 l-34 30 z" fill="#E04848" />
          {[
            [46, 94],
            [60, 97],
            [74, 94],
            [53, 104],
            [67, 104],
            [60, 110],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fff" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Flipper({ id, mirrored = false }: { id?: string; mirrored?: boolean }) {
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
          <text
            x="11"
            y="18"
            fontSize="10"
            textAnchor="middle"
            fill="#fff"
            fontFamily="serif"
            transform={mirrored ? 'translate(22 0) scale(-1 1)' : undefined}
          >
            ∫
          </text>
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
    case 'valigetta':
      return (
        <g>
          <path d="M104 100 v-6 h12 v6" fill="none" stroke="#5A3B2A" strokeWidth="3" />
          <rect x="96" y="100" width="28" height="20" rx="3" fill="#8B5A3C" />
          <rect x="96" y="106" width="28" height="3" fill="#6B3E1F" />
          <rect x="108" y="104" width="4" height="6" rx="1" fill="#F5C542" />
        </g>
      );
    case 'chitarra':
      return (
        <g transform="translate(98 106) rotate(-35)">
          <rect x="-2.5" y="-46" width="5" height="34" fill="#8B5A3C" />
          <rect x="-4" y="-54" width="8" height="9" rx="2" fill="#5A3B2A" />
          <circle cx="0" cy="-12" r="8" fill="#E08A43" />
          <circle cx="0" cy="0" r="11" fill="#E08A43" />
          <circle cx="0" cy="-6" r="3.5" fill="#5A3B2A" />
          <rect x="-5" y="3" width="10" height="2.5" fill="#5A3B2A" />
          <path d="M-1 -46 v49 M1 -46 v49" stroke="#fff" strokeWidth="0.4" opacity="0.8" />
        </g>
      );
    case 'orologio':
      return (
        <g>
          <rect x="96" y="97" width="20" height="7" rx="2" fill="#8B5A3C" />
          <circle cx="106" cy="100.5" r="6.5" fill="#fff" stroke="#D9A21B" strokeWidth="2" />
          <path d="M106 100.5 v-3.5 M106 100.5 h2.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case 'bastoncino':
      return (
        <g transform="translate(108 70)" fill="none" strokeWidth="5" strokeLinecap="round">
          <path d="M6 44 V8 a7 7 0 0 0 -14 0" stroke="#fff" />
          <path d="M6 44 V8 a7 7 0 0 0 -14 0" stroke="#E04848" strokeDasharray="4 4" />
        </g>
      );
    case 'regalo':
      return (
        <g>
          <rect x="98" y="92" width="22" height="18" rx="2" fill="#E85D75" />
          <rect x="107" y="92" width="4" height="18" fill="#F5C542" />
          <rect x="98" y="99" width="22" height="4" fill="#F5C542" />
          <path d="M109 92 q-9 -9 -11 -2 q2 4 11 2 q9 -9 11 -2 q-2 4 -11 2 z" fill="#F5C542" stroke="#D9A21B" strokeWidth="0.8" />
        </g>
      );
    case 'calcolatrice':
      return (
        <g transform="translate(98 84) rotate(-8)">
          <rect x="0" y="0" width="18" height="26" rx="3" fill="#4a5866" />
          <rect x="3" y="3" width="12" height="6" rx="1" fill="#CDE8C5" />
          {[0, 1, 2].flatMap((i) =>
            [0, 1, 2].map((j) => <rect key={`${i}${j}`} x={3 + i * 4.5} y={12 + j * 4.5} width="3" height="3" rx="0.6" fill="#e8eef5" />)
          )}
        </g>
      );
    case 'ombrello':
      return (
        <g>
          <path d="M106 38 v62 q0 6 -5 6 q-4 0 -4 -4" fill="none" stroke="#5A3B2A" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M86 46 q20 -28 40 0 q-5 -4 -10 0 q-5 -4 -10 0 q-5 -4 -10 0 q-5 -4 -10 0 z" fill="#7C9CE0" />
          <path d="M106 46 q0 -14 0 -26" stroke="#5E80C8" strokeWidth="1.5" />
        </g>
      );
    case 'gelato':
      return (
        <g>
          <path d="M100 92 l8 22 l8 -22 z" fill="#E9B872" />
          <path d="M102 96 l10 8 M114 96 l-10 8" stroke="#C99A55" strokeWidth="1" />
          <circle cx="108" cy="88" r="8" fill="#F8BBD0" />
          <circle cx="108" cy="79" r="6.5" fill="#A8E6CF" />
          <circle cx="108" cy="71.5" r="2.5" fill="#E04848" />
        </g>
      );
    case 'bacchetta':
      return (
        <g>
          <path d="M104 104 L116 74" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d={starPath(117, 69, 8, 3.5)} fill="#F5C542" stroke="#D9A21B" strokeWidth="1" />
          <circle cx="108" cy="64" r="1.5" fill="#F5C542" />
          <circle cx="124" cy="78" r="1.2" fill="#F5C542" />
        </g>
      );
    case 'microfono':
      return (
        <g transform="translate(106 96) rotate(20)">
          <rect x="-3" y="0" width="6" height="22" rx="2" fill={INK} />
          <circle cx="0" cy="-4" r="7" fill="#c9d6e3" stroke="#8a96a3" strokeWidth="1.5" />
          <path d="M-5 -6 h10 M-6 -3 h12 M-5 0 h10" stroke="#8a96a3" strokeWidth="0.8" />
        </g>
      );
    case 'pallina':
      return (
        <g>
          <path d="M108 78 v9" stroke="#C9A227" strokeWidth="1.2" />
          <rect x="104.5" y="86" width="7" height="4" rx="1" fill="#D9A21B" />
          <circle cx="108" cy="99" r="9.5" fill="#E04848" />
          <path d="M99 99 q9 4 18 0" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.8" />
          <path d="M103 94 q2 -3 5 -3" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
        </g>
      );
    case 'caffe':
      return (
        <g transform="translate(98 86)">
          <path d="M0 4 h18 l-2 22 h-14 z" fill="#fff" stroke="#c9d6e3" strokeWidth="1.2" />
          <path d="M1 11 h16 l-0.6 7 h-14.8 z" fill="#C99A6B" />
          <rect x="-1" y="0" width="20" height="5" rx="2" fill="#8B5A3C" />
        </g>
      );
    case 'pizza':
      return (
        <g>
          <path d="M98 84 l24 6 l-18 22 z" fill="#F5C542" />
          <path d="M98 84 l24 6" stroke="#D9822B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="106" cy="94" r="2.6" fill="#E04848" />
          <circle cx="113" cy="94" r="2.4" fill="#E04848" />
          <circle cx="106" cy="102" r="2.2" fill="#E04848" />
        </g>
      );
    case 'righello':
      return (
        <g transform="translate(102 72) rotate(20)">
          <rect x="0" y="0" width="7" height="40" rx="1" fill="#F5D76E" stroke="#D9A21B" strokeWidth="0.8" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${4 + i * 4} h${i % 2 ? 2.5 : 4}`} stroke="#8a6a12" strokeWidth="0.8" />
          ))}
        </g>
      );
    case 'lanterna':
      return (
        <g>
          <path d="M102 82 q6 -9 12 0" fill="none" stroke="#4a5866" strokeWidth="2" />
          <rect x="100" y="82" width="16" height="4" rx="1" fill="#4a5866" />
          <rect x="101" y="86" width="14" height="16" fill="#FFE9A8" stroke="#4a5866" strokeWidth="1.5" />
          <ellipse cx="108" cy="95" rx="2.5" ry="4" fill="#F4A261" />
          <rect x="100" y="102" width="16" height="4" rx="1" fill="#4a5866" />
        </g>
      );
    case 'pupazzo':
      return (
        <g>
          <circle cx="108" cy="105" r="9" fill="#fff" stroke="#dfe5ee" strokeWidth="1.2" />
          <circle cx="108" cy="91" r="6.5" fill="#fff" stroke="#dfe5ee" strokeWidth="1.2" />
          <rect x="103" y="96" width="10" height="2.6" rx="1" fill="#E04848" />
          <circle cx="106" cy="90" r="0.9" fill={INK} />
          <circle cx="110" cy="90" r="0.9" fill={INK} />
          <path d="M108 92 l4 1 l-4 1 z" fill="#F4A261" />
          <rect x="103.5" y="80" width="9" height="5" fill={INK} />
          <rect x="101.5" y="84.5" width="13" height="2" fill={INK} />
        </g>
      );
    case 'calza':
      return (
        <g transform="translate(98 86)">
          <path d="M2 0 h12 v16 q0 4 4 6 l4 2 q4 3 1 7 q-3 3 -8 0 l-10 -6 q-3 -2 -3 -6 z" fill="#E04848" />
          <rect x="0" y="-3" width="16" height="6" rx="2" fill="#fff" />
        </g>
      );
    case 'racchetta':
      return (
        <g transform="translate(104 108) rotate(-25)">
          <rect x="-2" y="0" width="4" height="14" rx="1.5" fill="#5A3B2A" />
          <ellipse cx="0" cy="-12" rx="9" ry="12" fill="#fff" fillOpacity="0.5" stroke="#3BA36B" strokeWidth="3" />
          <path d="M-4 -22 v20 M0 -24 v24 M4 -22 v20 M-8 -16 h16 M-9 -11 h18 M-8 -6 h16" stroke="#9aa8b8" strokeWidth="0.6" />
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
      {look.testa && BEHIND_HEAD.has(look.testa) && <Head id={look.testa} />}
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
      {!(look.testa && BEHIND_HEAD.has(look.testa)) && <Head id={look.testa} />}
      <ellipse cx="106" cy="90" rx="10" ry="24" fill={c.wing} />
      <Flipper id={look.pinna} />
      {/* Pinna sinistra: stessi oggetti, specchiati */}
      <g transform="translate(120 0) scale(-1 1)">
        <Flipper id={look.pinnaSx} mirrored />
      </g>
    </svg>
  );
}
