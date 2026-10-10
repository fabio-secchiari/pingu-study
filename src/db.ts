import Dexie, { type Table } from 'dexie';
import type { Chapter, Item, ProofImage, Subject } from './types';

export class AppDB extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  items!: Table<Item, string>;
  proofImages!: Table<ProofImage, string>;

  constructor() {
    super('penguin-study');
    this.version(1).stores({
      subjects: 'id, name, createdAt',
      chapters: 'id, subjectId, order',
      items: 'id, subjectId, chapterId, type, createdAt',
      proofImages: 'id, itemId, createdAt',
    });
  }
}

export const db = new AppDB();