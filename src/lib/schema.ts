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

/** Comandi LaTeX che iniziano per "n": `\n` seguito da uno di questi non è un a capo. */
const LATEX_N_COMMANDS = new Set([
  'ne', 'neq', 'neg', 'nabla', 'nu', 'not', 'notin', 'ni', 'nexists', 'nmid',
  'nleq', 'ngeq', 'nless', 'ngtr', 'nsubseteq', 'nsupseteq', 'newline',
  'natural', 'nearrow', 'nwarrow', 'nRightarrow', 'nLeftrightarrow', 'nrightarrow',
  'nleftrightarrow', 'nparallel', 'nsim', 'ncong', 'normalsize', 'noindent',
]);

/**
 * Ripara i backslash dentro le stringhe JSON prodotte da un LLM con LaTeX non escapato.
 * - Mantiene gli escape JSON legittimi: `\\`, `\"`, `\/`, `\uXXXX`, e `\n` usato come a capo.
 * - `\b \f \r \t` seguiti da una lettera sono comandi LaTeX (`\beta`, `\frac`, `\rightarrow`, `\times`).
 * - Tutti gli altri backslash (`\{`, `\,`, `\mathcal`, `\in`, ...) vengono raddoppiati.
 * È idempotente su JSON già corretto (salvo il caso, irrilevante qui, di un tab seguito da una lettera).
 */
export function repairJsonBackslashes(input: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch !== '\\') {
      out += ch;
      continue;
    }

    const next = input[i + 1] ?? '';
    if (next === '\\' || next === '"' || next === '/') {
      out += ch + next;
      i++;
    } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(input.slice(i + 2, i + 6))) {
      out += input.slice(i, i + 6);
      i += 5;
    } else if (next === 'n') {
      const word = /^[A-Za-z]*/.exec(input.slice(i + 1))![0];
      out += LATEX_N_COMMANDS.has(word) ? '\\\\' : '\\';
    } else if (next !== '' && 'bfrt'.includes(next)) {
      out += /[A-Za-z]/.test(input[i + 2] ?? '') ? '\\\\' : '\\';
    } else {
      out += '\\\\';
    }
  }
  return out;
}

/**
 * Parse "tollerante" per JSON generati da LLM.
 * La riparazione va applicata sempre: un JSON con solo `\rightarrow`, `\forall`, `\ne`...
 * è sintatticamente valido ma `JSON.parse` li trasformerebbe in caratteri di controllo.
 */
export function parseJsonLoose<T = unknown>(text: string): T {
  try {
    return JSON.parse(repairJsonBackslashes(text)) as T;
  } catch {
    return JSON.parse(text) as T;
  }
}