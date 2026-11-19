import katex from 'katex';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { allMacros, katexOptions } from '../../lib/katexMacros';
import { AUTO_COMMANDS, findMathZones } from './latexSuite';

/* ------------------------------------------------------------------ */
/* Comandi conosciuti (per i suggerimenti "forse intendevi…")          */
/* ------------------------------------------------------------------ */

const COMMON = `
alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho
sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega
sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh coth log ln lg exp lim liminf limsup sup inf max min
arg deg det dim gcd hom ker Pr
frac dfrac tfrac cfrac binom dbinom tbinom sqrt sum prod coprod int iint iiint oint bigcup bigcap bigoplus bigotimes
bigvee bigwedge bigsqcup
leftarrow rightarrow leftrightarrow Leftarrow Rightarrow Leftrightarrow longleftarrow longrightarrow
longleftrightarrow Longleftarrow Longrightarrow Longleftrightarrow uparrow downarrow updownarrow Uparrow Downarrow
Updownarrow mapsto longmapsto hookleftarrow hookrightarrow nearrow searrow swarrow nwarrow to gets implies impliedby
iff rightleftharpoons leftrightharpoons rightharpoonup leftharpoonup xrightarrow xleftarrow leadsto
leq geq neq le ge ne ll gg approx sim simeq cong equiv propto prec succ preceq succeq subset supset subseteq
supseteq subsetneq supsetneq in notin ni mid nmid parallel perp vdash models asymp doteq coloneqq
pm mp times div cdot ast star circ bullet oplus ominus otimes oslash odot cup cap setminus wedge vee land lor neg
lnot sqcup sqcap uplus
forall exists nexists emptyset varnothing infty partial nabla ell hbar aleph Re Im wp angle triangle square
blacksquare Box diamond clubsuit heartsuit spadesuit top bot therefore because checkmark dagger ddagger
ldots cdots vdots ddots dots quad qquad
left right big Big bigg Bigg middle langle rangle lvert rvert lVert rVert lfloor rfloor lceil rceil
hat widehat tilde widetilde bar overline underline vec dot ddot acute grave breve check overrightarrow
overleftarrow underbrace overbrace overset underset stackrel boxed cancel bcancel xcancel not
text textbf textit textrm mathrm mathbf mathit mathsf mathtt mathcal mathbb mathfrak mathscr boldsymbol bm
operatorname displaystyle textstyle scriptstyle color textcolor colorbox phantom hspace vspace
begin end newline
`;

let knownCache: string[] | null = null;

function knownCommands(): string[] {
  if (knownCache) return knownCache;
  const names = new Set<string>([
    ...COMMON.split(/\s+/).filter(Boolean),
    ...AUTO_COMMANDS.symbols,
    ...AUTO_COMMANDS.oneArg,
    ...AUTO_COMMANDS.twoArgs,
  ]);
  knownCache = [...names];
  return knownCache;
}

/** Distanza di Damerau-Levenshtein (con scambio di lettere vicine). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const sortedLetters = (s: string) => s.toLowerCase().split('').sort().join('');

/** Il comando conosciuto più simile a `name` (senza backslash), se ce n'è uno abbastanza vicino. */
export function suggestCommand(name: string): string | null {
  const macros = allMacros();
  const pool = [...new Set([...knownCommands(), ...Object.keys(macros).map((k) => k.slice(1))])];
  const lower = name.toLowerCase();
  let best: string | null = null;
  let bestScore = Infinity;
  for (const cand of pool) {
    let score = distance(name, cand);
    if (cand.toLowerCase() === lower) score = 0.5; // solo maiuscole/minuscole diverse
    else if (score > 1 && sortedLetters(cand) === sortedLetters(name) && name.length > 4) score = 1.5; // pezzi scambiati
    if (score < bestScore || (score === bestScore && best && cand.length < best.length)) {
      best = cand;
      bestScore = score;
    }
  }
  const max = name.length <= 3 ? 1 : name.length <= 6 ? 2 : 3;
  if (!best || bestScore > max) return null;
  // Gli alias (\Rightlongarrow → \Longrightarrow) suggeriscono direttamente il comando vero
  const target = /^\\([a-zA-Z]+)$/.exec(macros['\\' + best] ?? '');
  return target ? target[1] : best;
}

/* ------------------------------------------------------------------ */
/* Controllo di una formula                                            */
/* ------------------------------------------------------------------ */

export interface FormulaError {
  /** Posizioni relative al testo della formula */
  from: number;
  to: number;
  message: string;
  /** Sostituzione proposta per [from, to] */
  fix?: string;
}

function unmatchedOpenBrace(src: string): number {
  const stack: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '\\') {
      i++;
      continue;
    }
    if (src[i] === '{') stack.push(i);
    else if (src[i] === '}') stack.pop();
  }
  return stack.length ? stack[stack.length - 1] : -1;
}

/** Controlla una formula con KaTeX. null se è tutto a posto. */
export function checkFormula(src: string, display = false): FormulaError | null {
  if (!src.trim()) return null;
  try {
    katex.renderToString(src, { ...katexOptions(display), throwOnError: true });
    return null;
  } catch (e: any) {
    const raw: string = e?.rawMessage ?? String(e?.message ?? e);
    const pos: number | undefined = typeof e?.position === 'number' ? e.position : undefined;
    const len: number = typeof e?.length === 'number' ? e.length : 0;
    const at = (from: number, to: number) => ({ from: Math.max(0, from), to: Math.min(src.length, Math.max(to, from + 1)) });

    let m = /^Undefined control sequence: \\(.+)$/.exec(raw);
    if (m) {
      const name = m[1];
      const s = /^[a-zA-Z]+$/.test(name) ? suggestCommand(name) : null;
      const start = pos ?? src.indexOf('\\' + name);
      return {
        ...at(start, start + name.length + 1), // solo il comando, non lo spazio dopo
        message: s ? `Comando sconosciuto \\${name}: forse intendevi \\${s}?` : `Comando sconosciuto \\${name}`,
        fix: s ? '\\' + s : undefined,
      };
    }
    if (/expected '\}'|Expected '\}'/.test(raw)) {
      const open = unmatchedOpenBrace(src);
      return { ...at(open >= 0 ? open : src.length - 1, src.length), message: 'Manca una } di chiusura' };
    }
    if (/Expected '\\right'/.test(raw)) {
      const i = src.lastIndexOf('\\left');
      return { ...at(i >= 0 ? i : 0, i >= 0 ? i + 5 : src.length), message: 'C\'è un \\left senza il suo \\right' };
    }
    if (/Expected 'EOF', got '\}'/.test(raw) && pos !== undefined) {
      return { ...at(pos, pos + 1), message: 'C\'è una } di troppo', fix: '' };
    }
    if (/got '&'/.test(raw) && pos !== undefined) {
      return { ...at(pos, pos + 1), message: '& si usa solo dentro un ambiente come aligned, cases o pmatrix' };
    }
    if ((m = /Expected group after '([_^])'/.exec(raw)) && pos !== undefined) {
      return { ...at(pos, pos + 1), message: `Dopo ${m[1]} manca qualcosa, es. x${m[1]}{2}` };
    }
    if (/Double subscript/.test(raw) && pos !== undefined) {
      return { ...at(pos, pos + 1), message: 'Due pedici di fila: usa le graffe, es. x_{a_b}' };
    }
    if (/Double superscript/.test(raw) && pos !== undefined) {
      return { ...at(pos, pos + 1), message: 'Due esponenti di fila: usa le graffe, es. x^{a^b}' };
    }
    if (/No such environment: (.+)/.test(raw)) {
      const env = /No such environment: (.+?)(?: at|$)/.exec(raw)?.[1] ?? '';
      const i = src.indexOf(env);
      return { ...at(i >= 0 ? i : 0, i >= 0 ? i + env.length : src.length), message: `Ambiente sconosciuto "${env}"` };
    }
    if (/Expected '\\end'/.test(raw)) {
      const i = src.lastIndexOf('\\begin');
      return { ...at(i >= 0 ? i : 0, i >= 0 ? i + 6 : src.length), message: 'Manca il \\end corrispondente' };
    }
    const from = pos ?? 0;
    return { ...at(from, pos !== undefined ? from + (len || 1) : src.length), message: raw.replace(/ at position \d+.*$/, '') };
  }
}

/* ------------------------------------------------------------------ */
/* Sottolineato rosso nell'editor                                     */
/* ------------------------------------------------------------------ */

const refresh = StateEffect.define<null>();
const DELAY = 700; // non segnare in rosso mentre si sta ancora scrivendo

function build(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const ranges = [];
  for (const z of findMathZones(text)) {
    const err = checkFormula(text.slice(z.from, z.to), z.display);
    if (!err) continue;
    const from = z.from + err.from;
    const to = Math.min(z.to, z.from + err.to);
    if (to <= from) continue;
    ranges.push(Decoration.mark({ class: 'cm-latex-error', attributes: { title: err.message } }).range(from, to));
  }
  return Decoration.set(ranges, true);
}

export const latexLint = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    timer = 0;
    constructor(readonly view: EditorView) {
      this.decorations = build(view);
    }
    update(u: ViewUpdate) {
      if (u.transactions.some((t) => t.effects.some((e) => e.is(refresh)))) {
        this.decorations = build(u.view);
        return;
      }
      if (u.docChanged) {
        this.decorations = this.decorations.map(u.changes);
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.view.dispatch({ effects: refresh.of(null) }), DELAY);
      }
    }
    destroy() {
      window.clearTimeout(this.timer);
    }
  },
  { decorations: (v) => v.decorations }
);

/** Ricontrolla subito (es. quando cambiano i comandi personali). */
export function relint(view: EditorView) {
  view.dispatch({ effects: refresh.of(null) });
}
