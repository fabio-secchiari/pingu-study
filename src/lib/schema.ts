import { z } from 'zod';

const normalizeType = (v: unknown) => {
  if (typeof v !== 'string') return v;
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const ItemTypeSchema = z.preprocess(
  normalizeType,
  z.enum(['definizione', 'teorema', 'proprieta', 'corollario'])
);

/** Formato "leggero" pensato per l'output di un LLM. */
export const LLMItemSchema = z.object({
  type: ItemTypeSchema,
  title: z.string().min(1),
  description: z.string().default(''),
  needsProof: z.boolean().default(false),
  proofText: z.string().optional(),
});

export const LLMChapterSchema = z.object({
  title: z.string().min(1),
  items: z.array(LLMItemSchema).default([]),
});

export const LLMSubjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  chapters: z.array(LLMChapterSchema).default([]),
});

export const LLMImportSchema = z.object({
  version: z.literal(1).default(1),
  subjects: z.array(LLMSubjectSchema).min(1),
});

export type LLMImport = z.infer<typeof LLMImportSchema>;

/** Backup completo (con id, timestamp e immagini in base64). */
const BackupImageSchema = z.object({
  id: z.string(),
  dataUrl: z.string(),
  createdAt: z.number(),
});

const BackupItemSchema = z.object({
  id: z.string(),
  type: ItemTypeSchema,
  title: z.string(),
  description: z.string().default(''),
  needsProof: z.boolean().default(false),
  proofText: z.string().optional(),
  createdAt: z.number(),
  proofImages: z.array(BackupImageSchema).default([]),
});

const BackupChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  items: z.array(BackupItemSchema).default([]),
});

const BackupSubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().default('blue'),
  createdAt: z.number(),
  chapters: z.array(BackupChapterSchema).default([]),
});

export const BackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  subjects: z.array(BackupSubjectSchema),
});

export type Backup = z.infer<typeof BackupSchema>;