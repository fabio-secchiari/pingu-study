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

export const ACCESSORIES = [
  { id: 'none', label: 'Niente', fish: 0 },
  { id: 'sciarpa', label: 'Sciarpa', fish: 5 },
  { id: 'occhiali', label: 'Occhiali da studio', fish: 15 },
  { id: 'cuffia', label: 'Cuffia di lana', fish: 30 },
  { id: 'fiocco', label: 'Fiocco', fish: 50 },
  { id: 'corona', label: 'Coroncina', fish: 75 },
  { id: 'tocco', label: 'Tocco da laurea', fish: 100 },
] as const;
export type AccessoryId = (typeof ACCESSORIES)[number]['id'];

export interface Profile extends CloudFields {
  id: string;
  userId: string;
  name: string;
  color: 'blue' | 'pink';
  accessory: AccessoryId;
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
