import type { Item } from '../types';

/**
 * Bozza della scheda che stai scrivendo: salvata a ogni modifica, così se l'app viene
 * ricaricata o chiusa (es. iPad che la sospende) la ritrovi al rientro nella materia.
 */
export interface ItemDraft {
  subjectId: string;
  chapterId: string;
  /** true se è un elemento nuovo, mai salvato */
  isNew: boolean;
  draft: Item;
  proofText: string;
  savedAt: number;
}

const KEY = 'penguin-item-draft';

export function loadDraft(): ItemDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ItemDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: ItemDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* spazio pieno o storage non disponibile */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
