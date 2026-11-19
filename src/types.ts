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

/** Dove si indossa un cosmetico. Gli oggetti "pinna" si possono tenere in tutte e due le pinne. */
export type CosmeticKind = 'testa' | 'viso' | 'collo' | 'pinna';
/** Posti sul pinguino: `pinna` è la destra (vista da chi guarda), `pinnaSx` la sinistra. */
export type CosmeticSlot = CosmeticKind | 'pinnaSx';

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  testa: 'Testa',
  viso: 'Viso',
  collo: 'Collo',
  pinnaSx: 'Pinna sinistra',
  pinna: 'Pinna destra',
};

/** Che tipo di oggetto va in un certo posto. */
export const kindOfSlot = (slot: CosmeticSlot): CosmeticKind => (slot === 'pinnaSx' ? 'pinna' : slot);

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
  { id: 'fascia', slot: 'testa', label: 'Fascetta sportiva', fish: 42 },
  { id: 'paraorecchie', slot: 'testa', label: 'Paraorecchie', fish: 58 },
  { id: 'elmetto', slot: 'testa', label: 'Elmetto da cantiere', fish: 110 },
  { id: 'chef', slot: 'testa', label: 'Cappello da chef', fish: 150 },
  { id: 'cowboy', slot: 'testa', label: 'Cappello da cowboy', fish: 180 },
  { id: 'cilindro', slot: 'testa', label: 'Cilindro', fish: 220 },
  { id: 'pirata', slot: 'testa', label: 'Cappello da pirata', fish: 260 },
  // Viso
  { id: 'guance', slot: 'viso', label: 'Guance a cuore', fish: 4 },
  { id: 'occhiali', slot: 'viso', label: 'Occhiali da studio', fish: 12 },
  { id: 'sole', slot: 'viso', label: 'Occhiali da sole', fish: 28 },
  { id: 'monocolo', slot: 'viso', label: 'Monocolo', fish: 55 },
  { id: 'baffi', slot: 'viso', label: 'Baffoni', fish: 38 },
  { id: 'benda', slot: 'viso', label: 'Benda da pirata', fish: 70 },
  { id: 'cuori', slot: 'viso', label: 'Occhiali a cuore', fish: 85 },
  { id: 'maschera', slot: 'viso', label: 'Maschera da sci', fish: 140 },
  // Collo
  { id: 'sciarpa', slot: 'collo', label: 'Sciarpa', fish: 5 },
  { id: 'papillon', slot: 'collo', label: 'Papillon', fish: 10 },
  { id: 'campanello', slot: 'collo', label: 'Campanellino', fish: 22 },
  { id: 'perle', slot: 'collo', label: 'Collana di perle', fish: 40 },
  { id: 'medaglia', slot: 'collo', label: "Medaglia d'oro", fish: 90 },
  { id: 'bandana', slot: 'collo', label: 'Bandana', fish: 33 },
  { id: 'cravatta', slot: 'collo', label: 'Cravatta', fish: 52 },
  { id: 'collanafiori', slot: 'collo', label: 'Collana hawaiana', fish: 125 },
  { id: 'stetoscopio', slot: 'collo', label: 'Stetoscopio', fish: 200 },
  // In pinna
  { id: 'pesce', slot: 'pinna', label: 'Pesciolino', fish: 2 },
  { id: 'libro', slot: 'pinna', label: 'Libro di Analisi', fish: 7 },
  { id: 'matita', slot: 'pinna', label: 'Matita', fish: 14 },
  { id: 'tazza', slot: 'pinna', label: 'Tazza di cioccolata', fish: 18 },
  { id: 'palloncino', slot: 'pinna', label: 'Palloncino a cuore', fish: 32 },
  { id: 'rosa', slot: 'pinna', label: 'Rosa', fish: 65 },
  { id: 'righello', slot: 'pinna', label: 'Righello', fish: 24 },
  { id: 'pizza', slot: 'pinna', label: 'Fetta di pizza', fish: 27 },
  { id: 'caffe', slot: 'pinna', label: 'Caffè da asporto', fish: 36 },
  { id: 'gelato', slot: 'pinna', label: 'Gelato', fish: 64 },
  { id: 'calcolatrice', slot: 'pinna', label: 'Calcolatrice', fish: 78 },
  { id: 'orologio', slot: 'pinna', label: 'Orologio', fish: 100 },
  { id: 'microfono', slot: 'pinna', label: 'Microfono', fish: 115 },
  { id: 'ombrello', slot: 'pinna', label: 'Ombrello', fish: 135 },
  { id: 'valigetta', slot: 'pinna', label: 'Valigetta 24 ore', fish: 160 },
  { id: 'racchetta', slot: 'pinna', label: 'Racchetta da tennis', fish: 170 },
  { id: 'bacchetta', slot: 'pinna', label: 'Bacchetta magica', fish: 240 },
  { id: 'lanterna', slot: 'pinna', label: 'Lanterna', fish: 190 },
  { id: 'chitarra', slot: 'pinna', label: 'Chitarra', fish: 300 },
] as const satisfies readonly { id: string; slot: CosmeticKind; label: string; fish: number }[];

/**
 * Cosmetici a tempo: si comprano solo durante il loro evento, con la valuta dell'evento
 * (1 pomodoro fatto nel periodo = 1 moneta). Chi li compra li tiene per sempre.
 */
export const SEASONAL_COSMETICS = [
  // Natale
  { id: 'agrifoglio', slot: 'testa', label: 'Rametto di agrifoglio', event: 'natale', cost: 8, group: 'Natale' },
  { id: 'pallina', slot: 'pinna', label: 'Pallina di Natale', event: 'natale', cost: 8, group: 'Natale' },
  { id: 'bastoncino', slot: 'pinna', label: 'Bastoncino di zucchero', event: 'natale', cost: 10, group: 'Natale' },
  { id: 'nasorosso', slot: 'viso', label: 'Naso rosso da renna', event: 'natale', cost: 12, group: 'Natale' },
  { id: 'sciarpaNatale', slot: 'collo', label: 'Sciarpa natalizia', event: 'natale', cost: 15, group: 'Natale' },
  { id: 'regalo', slot: 'pinna', label: 'Pacchetto regalo', event: 'natale', cost: 15, group: 'Natale' },
  { id: 'corna', slot: 'testa', label: 'Corna da renna', event: 'natale', cost: 20, group: 'Natale' },
  { id: 'elfo', slot: 'testa', label: 'Cappello da elfo', event: 'natale', cost: 22, group: 'Natale' },
  { id: 'lucine', slot: 'collo', label: 'Lucine di Natale', event: 'natale', cost: 25, group: 'Natale' },
  { id: 'stella', slot: 'testa', label: "Stella dell'albero", event: 'natale', cost: 28, group: 'Natale' },
  { id: 'barba', slot: 'viso', label: 'Barba bianca', event: 'natale', cost: 30, group: 'Natale' },
  { id: 'pupazzo', slot: 'pinna', label: 'Pupazzo di neve', event: 'natale', cost: 35, group: 'Natale' },
  // Capodanno
  { id: 'trombetta', slot: 'pinna', label: 'Trombetta di Capodanno', event: 'natale', cost: 6, group: 'Capodanno' },
  { id: 'festa', slot: 'testa', label: 'Cappellino da festa', event: 'natale', cost: 10, group: 'Capodanno' },
  { id: 'spumante', slot: 'pinna', label: 'Calice di spumante', event: 'natale', cost: 12, group: 'Capodanno' },
  { id: 'anno', slot: 'viso', label: 'Occhiali del nuovo anno', event: 'natale', cost: 18, group: 'Capodanno' },
  // Befana
  { id: 'carbone', slot: 'pinna', label: 'Carbone dolce', event: 'natale', cost: 6, group: 'Befana' },
  { id: 'calza', slot: 'pinna', label: 'Calza della Befana', event: 'natale', cost: 15, group: 'Befana' },
  { id: 'befana', slot: 'testa', label: 'Fazzoletto della Befana', event: 'natale', cost: 18, group: 'Befana' },
  { id: 'scopa', slot: 'pinna', label: 'Scopa della Befana', event: 'natale', cost: 25, group: 'Befana' },
] as const satisfies readonly { id: string; slot: CosmeticKind; label: string; event: string; cost: number; group: string }[];

export type SeasonalCosmetic = (typeof SEASONAL_COSMETICS)[number];
export type CosmeticId = (typeof COSMETICS)[number]['id'] | SeasonalCosmetic['id'];

/** Un cosmetico a tempo comprato: resta per sempre. */
export interface OwnedCosmetic {
  id: CosmeticId;
  /** Edizione dell'evento, es. "natale-2026" */
  event: string;
  /** Monete spese (0 = regalato) */
  paid: number;
  at: number;
}
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
  /** Cosmetici a tempo comprati durante gli eventi */
  owned?: OwnedCosmetic[];
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
  /** Comandi LaTeX personali, condivisi nell'igloo: \\nome → corpo (con #1, #2… per gli argomenti) */
  customCommands?: CustomCommand[];
  /** Scorciatoie personali dell'editor: trigger → testo inserito */
  customSnippets?: CustomSnippet[];
}

export interface CustomCommand {
  /** Senza backslash */
  name: string;
  body: string;
}

export interface CustomSnippet {
  trigger: string;
  body: string;
  /** true = funziona anche fuori dalle formule */
  anywhere?: boolean;
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)) as string;
