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

export interface Subject {
  id: string;
  name: string;
  color: string; // 'blue' | 'pink'
  createdAt: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface Item {
  id: string;
  subjectId: string;
  chapterId: string;
  type: ItemType;
  title: string;
  description: string;
  needsProof: boolean;
  proofText?: string;
  createdAt: number;
}

export interface ProofImage {
  id: string;
  itemId: string;
  blob: Blob;
  createdAt: number;
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;