import { EditorView, Decoration, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { type Range } from '@codemirror/state';
import { snippet } from '@codemirror/autocomplete';

/* ------------------------------------------------------------------ */
/* Zone matematiche                                                    */
/* ------------------------------------------------------------------ */

export interface MathZone {
  from: number; // inizio del contenuto (dopo i $)
  to: number; // fine del contenuto (prima dei $)
  open: number; // posizione del primo $
  close: number; // posizione dopo l'ultimo $
  display: boolean;
}

const MATH_RE = /\$\$([\s\S]*?)\$\$|\$([^$\n]*?)\$/g;

export function findMathZones(text: string): MathZone[] {
  const zones: MathZone[] = [];
  for (const m of text.matchAll(MATH_RE)) {
    if (m.index! > 0 && text[m.index! - 1] === '\\') continue; // \$ letterale
    const display = m[1] !== undefined;
    const d = display ? 2 : 1;
    zones.push({
      open: m.index!,
      from: m.index! + d,
      to: m.index! + m[0].length - d,
      close: m.index! + m[0].length,
      display,
    });
  }
  return zones;
}

export function zoneAt(text: string, pos: number): MathZone | null {
  return findMathZones(text).find((z) => pos >= z.from && pos <= z.to) ?? null;
}

/* ------------------------------------------------------------------ */
/* Evidenziazione (colori come in LaTeX Suite)                         */
/* ------------------------------------------------------------------ */

const mk = (cls: string) => Decoration.mark({ class: cls });
const D = {
  delim: mk('cm-m-delim'),
  cmd: mk('cm-m-cmd'),
  num: mk('cm-m-num'),
  brace: mk('cm-m-brace'),
  op: mk('cm-m-op'),
  mdMark: mk('cm-md-mark'),
  bold: mk('cm-md-bold'),
  italic: mk('cm-md-italic'),
  hl: mk('cm-md-hl'),
  list: mk('cm-md-list'),
  heading: mk('cm-md-heading'),
  quote: mk('cm-md-quote'),
  link: mk('cm-md-link'),
};

function buildDecorations(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const ranges: Range<Decoration>[] = [];
  const zones = findMathZones(text);

  // Testo fuori dalle formule: markdown
  let last = 0;
  const textChunks: [number, number][] = [];
  for (const z of zones) {
    textChunks.push([last, z.open]);
    last = z.close;
  }
  textChunks.push([last, text.length]);

  for (const [a, b] of textChunks) {
    if (b <= a) continue;
    const chunk = text.slice(a, b);
    const add = (re: RegExp, fn: (m: RegExpMatchArray, s: number) => void) => {
      for (const m of chunk.matchAll(re)) fn(m, a + m.index!);
    };
    add(/\*\*([^*\n]+)\*\*/g, (m, s) => {
      ranges.push(D.mdMark.range(s, s + 2), D.bold.range(s + 2, s + m[0].length - 2), D.mdMark.range(s + m[0].length - 2, s + m[0].length));
    });
    add(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, (m, s) => {
      const st = s + m[1].length;
      const en = s + m[0].length;
      ranges.push(D.mdMark.range(st, st + 1), D.italic.range(st + 1, en - 1), D.mdMark.range(en - 1, en));
    });
    add(/==([^=\n]+)==/g, (m, s) => {
      ranges.push(D.mdMark.range(s, s + 2), D.hl.range(s + 2, s + m[0].length - 2), D.mdMark.range(s + m[0].length - 2, s + m[0].length));
    });
    add(/\[\[[^\]\n]+\]\]/g, (m, s) => ranges.push(D.link.range(s, s + m[0].length)));
    add(/^[ \t]*(?:[-*+]|\d+\.)[ \t]/gm, (m, s) => ranges.push(D.list.range(s, s + m[0].length)));
    add(/^#{1,6} [^\n]*/gm, (m, s) => ranges.push(D.heading.range(s, s + m[0].length)));
    add(/^>[^\n]*/gm, (m, s) => ranges.push(D.quote.range(s, s + Math.min(m[0].length, /^>\s*(\[![^\]]*\])?/.exec(m[0])![0].length))));
  }

  // Dentro le formule: comandi, numeri, graffe, operatori
  for (const z of zones) {
    ranges.push(D.delim.range(z.open, z.from));
    const inner = text.slice(z.from, z.to);
    for (const m of inner.matchAll(/(\\[a-zA-Z]+|\\.)|(\d+(?:[.,]\d+)?)|([{}])|([\^_&=<>+\-])/g)) {
      const s = z.from + m.index!;
      const e = s + m[0].length;
      ranges.push((m[1] ? D.cmd : m[2] ? D.num : m[3] ? D.brace : D.op).range(s, e));
    }
    if (z.close > z.to) ranges.push(D.delim.range(z.to, z.close));
  }

  return Decoration.set(ranges, true);
}

export const latexHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged) this.decorations = buildDecorations(u.view);
    }
  },
  { decorations: (v) => v.decorations }
);

/* ------------------------------------------------------------------ */
/* Snippet stile LaTeX Suite                                           */
/* ------------------------------------------------------------------ */

export interface Snip {
  trigger: string;
  /** Sintassi snippet di CodeMirror: ${1}, ${2:default}… */
  body: string;
  /** 'math' = solo dentro $…$, 'text' = solo fuori, 'any' = ovunque */
  where: 'math' | 'text' | 'any';
  /** Se true il trigger non deve seguire una lettera o un backslash (es. "inf" dentro "\infty"). */
  word?: boolean;
  /** Parola-comando automatica (vedi AUTO_COMMANDS) */
  auto?: boolean;
}

export const SNIPPETS: Snip[] = [
  { trigger: 'mk', body: '$${1}$${2}', where: 'text', word: true },
  { trigger: 'dm', body: '$$\n${1}\n$$\n${2}', where: 'text', word: true },
  { trigger: '//', body: '\\frac{${1}}{${2}}${3}', where: 'math' },
  { trigger: 'sq', body: '\\sqrt{${1}}${2}', where: 'math', word: true },
  { trigger: 'sr', body: '^{2}', where: 'math', word: true },
  { trigger: 'cb', body: '^{3}', where: 'math', word: true },
  { trigger: 'rd', body: '^{${1}}${2}', where: 'math', word: true },
  { trigger: 'td', body: '^{${1}}${2}', where: 'math', word: true },
  { trigger: 'lim', body: '\\lim_{${1:n} \\to ${2:\\infty}} ${3}', where: 'math', word: true },
  { trigger: 'sum', body: '\\sum_{${1:n=1}}^{${2:\\infty}} ${3}', where: 'math', word: true },
  { trigger: 'prod', body: '\\prod_{${1:n=1}}^{${2:\\infty}} ${3}', where: 'math', word: true },
  { trigger: 'dint', body: '\\int_{${1:a}}^{${2:b}} ${3} \\, d${4:x}', where: 'math', word: true },
  { trigger: 'norm', body: '\\lVert ${1} \\rVert${2}', where: 'math', word: true },
  { trigger: 'abs', body: '\\lvert ${1} \\rvert${2}', where: 'math', word: true },
  { trigger: 'set', body: '\\{ ${1} \\}${2}', where: 'math', word: true },
  { trigger: 'bf', body: '\\mathbf{${1}}${2}', where: 'math', word: true },
  { trigger: 'cal', body: '\\mathcal{${1}}${2}', where: 'math', word: true },
  { trigger: 'text', body: '\\text{${1}}${2}', where: 'math', word: true },
  { trigger: 'ol', body: '\\overline{${1}}${2}', where: 'math', word: true },
  { trigger: 'hat', body: '\\hat{${1}}${2}', where: 'math', word: true },
  { trigger: 'ee', body: 'e^{${1}}${2}', where: 'math', word: true },
  { trigger: 'inf', body: '\\infty', where: 'math', word: true },
  { trigger: 'RR', body: '\\mathbb{R}', where: 'math', word: true },
  { trigger: 'NN', body: '\\mathbb{N}', where: 'math', word: true },
  { trigger: 'ZZ', body: '\\mathbb{Z}', where: 'math', word: true },
  { trigger: 'QQ', body: '\\mathbb{Q}', where: 'math', word: true },
  { trigger: 'CC', body: '\\mathbb{C}', where: 'math', word: true },
  { trigger: 'AA', body: '\\forall', where: 'math', word: true },
  { trigger: 'EE', body: '\\exists', where: 'math', word: true },
  { trigger: 'xx', body: '\\times', where: 'math', word: true },
  { trigger: '**', body: '\\cdot', where: 'math' },
  { trigger: '...', body: '\\dots', where: 'math' },
  { trigger: '->', body: '\\to', where: 'math' },
  { trigger: '=>', body: '\\implies', where: 'math' },
  { trigger: '<=>', body: '\\iff', where: 'math' },
  { trigger: '!=', body: '\\neq', where: 'math' },
  { trigger: '/=', body: '\\neq', where: 'math' },
  { trigger: '<=', body: '\\leq', where: 'math' },
  { trigger: '>=', body: '\\geq', where: 'math' },
  { trigger: '~~', body: '\\sim', where: 'math' },
  { trigger: 'inn', body: '\\in', where: 'math', word: true },
  { trigger: 'notin', body: '\\notin', where: 'math', word: true },
  { trigger: 'sub', body: '\\subseteq', where: 'math', word: true },
  { trigger: 'cup', body: '\\cup', where: 'math', word: true },
  { trigger: 'cap', body: '\\cap', where: 'math', word: true },
  ...[
    ['a', 'alpha'], ['b', 'beta'], ['g', 'gamma'], ['G', 'Gamma'], ['d', 'delta'], ['D', 'Delta'],
    ['e', 'varepsilon'], ['z', 'zeta'], ['h', 'eta'], ['t', 'theta'], ['T', 'Theta'], ['k', 'kappa'],
    ['l', 'lambda'], ['L', 'Lambda'], ['m', 'mu'], ['n', 'nu'], ['x', 'xi'], ['p', 'pi'], ['P', 'Pi'],
    ['r', 'rho'], ['s', 'sigma'], ['S', 'Sigma'], ['f', 'varphi'], ['F', 'Phi'], ['c', 'chi'],
    ['y', 'psi'], ['o', 'omega'], ['O', 'Omega'],
  ].map(([k, v]): Snip => ({ trigger: '@' + k, body: '\\' + v, where: 'math' })),
];

/**
 * Parole che diventano comandi da sole (stile LaTeX Suite): dentro una formula scrivi
 * "bar" e diventa \bar{}, "alpha" diventa \alpha, "sin" diventa \sin.
 * Scrivendo il backslash a mano (\bar) non succede nulla di automatico.
 */
const CMD_SYMBOLS = [
  'alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta',
  'vartheta', 'Theta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho',
  'varrho', 'sigma', 'Sigma', 'tau', 'upsilon', 'Upsilon', 'phi', 'varphi', 'Phi', 'chi', 'psi', 'Psi',
  'omega', 'Omega',
  'sin', 'cos', 'tan', 'cot', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'exp', 'max', 'min', 'sup',
  'det', 'ker',
  'partial', 'nabla', 'forall', 'exists', 'nexists', 'emptyset', 'varnothing', 'cdot', 'times', 'pm',
  'mp', 'circ', 'equiv', 'approx', 'simeq', 'cong', 'propto', 'perp', 'neq', 'leq', 'geq', 'implies',
  'impliedby', 'iff', 'to', 'mapsto', 'quad', 'qquad', 'ldots',
  'vdots', 'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil',
];
const CMD_ONE_ARG = [
  'bar', 'tilde', 'widetilde', 'vec', 'dot', 'ddot', 'widehat', 'overline', 'underline', 'sqrt',
  'mathbb', 'mathcal', 'mathbf', 'mathrm', 'mathscr', 'mathfrak', 'operatorname', 'boxed',
];
const CMD_TWO_ARGS = ['frac', 'dfrac', 'binom'];

const taken = new Set(SNIPPETS.map((s) => s.trigger));
for (const w of CMD_SYMBOLS)
  if (!taken.has(w)) SNIPPETS.push({ trigger: w, body: '\\' + w, where: 'math', word: true, auto: true });
for (const w of CMD_ONE_ARG)
  if (!taken.has(w)) SNIPPETS.push({ trigger: w, body: '\\' + w + '{${1}}${2}', where: 'math', word: true, auto: true });
for (const w of CMD_TWO_ARGS)
  if (!taken.has(w))
    SNIPPETS.push({ trigger: w, body: '\\' + w + '{${1}}{${2}}${3}', where: 'math', word: true, auto: true });

export const AUTO_COMMANDS = { symbols: CMD_SYMBOLS, oneArg: CMD_ONE_ARG, twoArgs: CMD_TWO_ARGS };

/** Un comando "nudo" (\alpha) ha bisogno di uno spazio dopo, altrimenti \alpha+b diventa \alphab. */
const withSpace = (body: string) => (/\\[a-zA-Z]+$/.test(body) ? body + ' ' : body);

// I trigger più lunghi hanno la precedenza ("<=>" prima di "=>")
const ORDERED = [...SNIPPETS].sort((a, b) => b.trigger.length - a.trigger.length);

/** True se la posizione è dentro un \text{...} (lì le parole restano parole). */
function insideText(text: string, zoneFrom: number, pos: number): boolean {
  const chunk = text.slice(zoneFrom, pos);
  const i = chunk.lastIndexOf('\\text{');
  if (i < 0) return false;
  let depth = 0;
  for (const ch of chunk.slice(i + 5)) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth > 0;
}

export const latexSnippets = EditorView.inputHandler.of((view, from, to, inserted) => {
  if (inserted.length !== 1 || from !== to) return false;
  const doc = view.state.doc;
  const before = doc.sliceString(Math.max(0, from - 20), from) + inserted;
  const fullText = doc.sliceString(0, from) + inserted + doc.sliceString(to);
  const pos = from + 1;
  const zone = zoneAt(fullText, pos);
  // Una zona "aperta" (solo il primo $) conta come matematica: closeBrackets aggiunge il $ finale
  const inMath = !!zone;

  // Auto-pedice: x1 -> x_1 (lettera singola seguita da cifra)
  if (inMath) {
    const m = /(?:^|[^\\a-zA-Z])([a-zA-Z])(\d)$/.exec(before);
    if (m) {
      view.dispatch({
        changes: { from, to, insert: '_' + m[2] },
        selection: { anchor: from + 2 },
        userEvent: 'input.snippet',
      });
      return true;
    }
  }

  // Scrivendo } davanti a una } già presente, ci si passa sopra invece di raddoppiarla
  if (inMath && inserted === '}' && doc.sliceString(to, to + 1) === '}') {
    view.dispatch({ selection: { anchor: to + 1 }, userEvent: 'input' });
    return true;
  }

  // ^ e _ aprono subito le graffe: x^ -> x^{|}  (Tab per uscire)
  if (inMath && (inserted === '^' || inserted === '_') && doc.sliceString(to, to + 1) !== '{') {
    snippet(inserted + '{${1}}${2}')(view, null as any, from, to);
    return true;
  }

  const inText = inMath && zone ? insideText(fullText, zone.from, pos) : false;

  for (const s of ORDERED) {
    if (!before.endsWith(s.trigger)) continue;
    if (inText && s.word) continue;
    if (s.where === 'math' && !inMath) continue;
    if (s.where === 'text' && inMath) continue;
    if (s.word) {
      const prev = before[before.length - s.trigger.length - 1];
      if (prev && /[a-zA-Z\\]/.test(prev)) continue;
    }
    const start = from - (s.trigger.length - 1);
    snippet(withSpace(s.body))(view, null as any, start, to);
    return true;
  }
  return false;
});

/* ------------------------------------------------------------------ */
/* Comandi della toolbar                                               */
/* ------------------------------------------------------------------ */

export function wrapSelection(view: EditorView, left: string, right = left, placeholder = '') {
  const { from, to } = view.state.selection.main;
  const sel = view.state.sliceDoc(from, to) || placeholder;
  view.dispatch({
    changes: { from, to, insert: left + sel + right },
    selection: { anchor: from + left.length, head: from + left.length + sel.length },
    userEvent: 'input',
  });
  view.focus();
  return true;
}

export function insertSnippet(view: EditorView, body: string) {
  const { from, to } = view.state.selection.main;
  snippet(body)(view, null as any, from, to);
  view.focus();
}

export function prefixLines(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);
  const changes = [];
  for (let n = startLine.number; n <= endLine.number; n++) {
    changes.push({ from: view.state.doc.line(n).from, insert: prefix });
  }
  view.dispatch({ changes, userEvent: 'input' });
  view.focus();
}
