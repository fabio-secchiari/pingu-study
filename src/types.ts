export const TYPE_VALUES = ['definizione', 'teorema', 'proprieta', 'corollario'] as const;
export type ItemType = (typeof TYPE_VALUES)[number];

export const TYPE_LABELS: Record<ItemType, string> = {
  definizione: 'Definizione',
  teorema: 'Teorema',
  proprieta: 'Proprietà',
  corollario: 'Corollario',
};

export const TYPE_COLORS: Record<ItemType, string> = {
  definizione: 'bg-blue-100 text-blue-800 border-blue-300',
  teorema: 'bg-pink-100 text-pink-800 border-pink-300',
  proprieta: 'bg-purple-100 text-purple-800 border-purple-300',
  corollario: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export const STATUS_VALUES = ['da-studiare', 'ripassato', 'padroneggiato'] as const;
export type StudyStatus = (typeof STATUS_VALUES)[number];

export const STATUS_LABELS: Record<StudyStatus, string> = {
  'da-studiare': 'Da studiare',
  ripassato: 'Ripassato',
  padroneggiato: 'Padroneggiato',
};

export const STATUS_DOT: Record<StudyStatus, string> = {
  'da-studiare': 'bg-rose-400',
  ripassato: 'bg-amber-400',
  padroneggiato: 'bg-emerald-500',
};

/** Campi che Dexie Cloud aggiunge a ogni oggetto sincronizzato. */
export interface CloudFields {
  realmId?: string;
  owner?: string;
}

export interface Subject extends CloudFields {
  id: string;
  name: string;
  color: string; // 'blue' | 'pink'
  createdAt: number;
  /** Data d'esame in formato YYYY-MM-DD */
  examDate?: string;
  examPassed?: boolean;
  examGrade?: string;
}

export interface Chapter extends CloudFields {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface Item extends CloudFields {
  id: string;
  subjectId: string;
  chapterId: string;
  type: ItemType;
  title: string;
  description: string;
  needsProof: boolean;
  proofText?: string;
  createdAt: number;
  /** Ordine manuale (drag & drop). Se assente si usa createdAt. */
  order?: number;
  status?: StudyStatus;
  /** Ripetizione spaziata */
  dueAt?: number;
  intervalDays?: number;
  ease?: number;
  reviews?: number;
}

export interface ProofImage extends CloudFields {
  id: string;
  itemId: string;
  blob: Blob;
  createdAt: number;
}

/** Un pomodoro completato o una sessione di ripasso. Ogni pomodoro vale un pesciolino. */
export interface StudySession extends CloudFields {
  id: string;
  userId: string;
  kind: 'pomodoro' | 'ripasso' | 'manuale';
  subjectId?: string;
  minutes: number;
  endedAt: number;
}

/** Bigliettino lasciato all'altra persona. */
export interface Note extends CloudFields {
  id: string;
  fromUserId: string;
  fromName: string;
  text: string;
  createdAt: number;
  readBy: string[];
}

export type CosmeticSlot = 'testa' | 'viso' | 'collo' | 'pinna';

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  testa: 'Testa',
  viso: 'Viso',
  collo: 'Collo',
  pinna: 'In pinna',
};

/** Cosmetici del pinguino: si sbloccano con i pesciolini (1 pomodoro = 1 🐟). */
export const COSMETICS = [
  // Testa
  { id: 'orecchie', slot: 'testa', label: 'Orecchie da coniglio', fish: 8 },
  { id: 'cappellino', slot: 'testa', label: 'Cappellino', fish: 15 },
  { id: 'fiocco', slot: 'testa', label: 'Fiocco', fish: 20 },
  { id: 'fiori', slot: 'testa', label: 'Coroncina di fiori', fish: 25 },
  { id: 'cuffia', slot: 'testa', label: 'Cuffia di lana', fish: 30 },
  { id: 'cuffie', slot: 'testa', label: 'Cuffie per la musica', fish: 35 },
  { id: 'aureola', slot: 'testa', label: 'Aureola', fish: 45 },
  { id: 'natale', slot: 'testa', label: 'Berretto di Natale', fish: 50 },
  { id: 'mago', slot: 'testa', label: 'Cappello da mago', fish: 60 },
  { id: 'corona', slot: 'testa', label: 'Coroncina', fish: 75 },
  { id: 'tocco', slot: 'testa', label: 'Tocco da laurea', fish: 100 },
  // Viso
  { id: 'guance', slot: 'viso', label: 'Guance a cuore', fish: 4 },
  { id: 'occhiali', slot: 'viso', label: 'Occhiali da studio', fish: 12 },
  { id: 'sole', slot: 'viso', label: 'Occhiali da sole', fish: 28 },
  { id: 'monocolo', slot: 'viso', label: 'Monocolo', fish: 55 },
  // Collo
  { id: 'sciarpa', slot: 'collo', label: 'Sciarpa', fish: 5 },
  { id: 'papillon', slot: 'collo', label: 'Papillon', fish: 10 },
  { id: 'campanello', slot: 'collo', label: 'Campanellino', fish: 22 },
  { id: 'perle', slot: 'collo', label: 'Collana di perle', fish: 40 },
  { id: 'medaglia', slot: 'collo', label: "Medaglia d'oro", fish: 90 },
  // In pinna
  { id: 'pesce', slot: 'pinna', label: 'Pesciolino', fish: 2 },
  { id: 'libro', slot: 'pinna', label: 'Libro di Analisi', fish: 7 },
  { id: 'matita', slot: 'pinna', label: 'Matita', fish: 14 },
  { id: 'tazza', slot: 'pinna', label: 'Tazza di cioccolata', fish: 18 },
  { id: 'palloncino', slot: 'pinna', label: 'Palloncino a cuore', fish: 32 },
  { id: 'rosa', slot: 'pinna', label: 'Rosa', fish: 65 },
] as const satisfies readonly { id: string; slot: CosmeticSlot; label: string; fish: number }[];

export type CosmeticId = (typeof COSMETICS)[number]['id'];
export type Cosmetics = Partial<Record<CosmeticSlot, CosmeticId>>;

/** Vecchio campo a scelta singola (versioni precedenti). */
export type AccessoryId = 'none' | 'sciarpa' | 'occhiali' | 'cuffia' | 'fiocco' | 'corona' | 'tocco';

/** Cosmetici di un profilo, convertendo il vecchio "accessory" se serve. */
export function cosmeticsOf(p?: { cosmetics?: Cosmetics; accessory?: AccessoryId } | null): Cosmetics {
  if (!p) return {};
  if (p.cosmetics) return p.cosmetics;
  const a = p.accessory;
  if (!a || a === 'none') return {};
  if (a === 'sciarpa') return { collo: 'sciarpa' };
  if (a === 'occhiali') return { viso: 'occhiali' };
  return { testa: a };
}

export interface Profile extends CloudFields {
  id: string;
  userId: string;
  name: string;
  color: 'blue' | 'pink';
  /** Vecchio campo (una sola scelta): usare `cosmetics` */
  accessory?: AccessoryId;
  cosmetics?: Cosmetics;
  /** Se nel futuro: sta facendo un pomodoro fino a questo istante. */
  studyingUntil?: number;
  studyingSubject?: string;
}

/** Impostazioni condivise dell'igloo (il pinguino domestico e le date speciali). */
export interface IglooSettings extends CloudFields {
  id: string;
  petName: string;
  /** YYYY-MM-DD */
  petBirthday: string;
  /** YYYY-MM-DD (le prime versioni salvavano solo MM-DD) */
  anniversary: string;
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)) as string;
