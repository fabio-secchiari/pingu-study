import { useSyncExternalStore } from 'react';

/**
 * Comandi in più per KaTeX: quelli che KaTeX non conosce ma che si usano spesso
 * (pacchetti physics, amsthm, notazione italiana) e qualche "nome sbagliato" comune
 * che altrimenti finirebbe in rosso (es. \Leftlongarrow invece di \Longleftarrow).
 */
const op = (name: string) => `\\operatorname{${name}}`;

export const KATEX_MACROS: Record<string, string> = {
  // Frecce lunghe scritte "al contrario"
  '\\Leftlongarrow': '\\Longleftarrow',
  '\\leftlongarrow': '\\longleftarrow',
  '\\Rightlongarrow': '\\Longrightarrow',
  '\\rightlongarrow': '\\longrightarrow',
  '\\Leftrightlongarrow': '\\Longleftrightarrow',
  '\\leftrightlongarrow': '\\longleftrightarrow',
  '\\longto': '\\longrightarrow',

  // Insiemi numerici (\R, \N, \Z esistono già)
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\K': '\\mathbb{K}',
  '\\one': '\\mathbb{1}',
  '\\mathbbm': '\\mathbb{#1}',
  '\\mathds': '\\mathbb{#1}',

  // Valori assoluti e norme che si adattano all'altezza
  '\\abs': '\\left\\lvert #1 \\right\\rvert',
  '\\norm': '\\left\\lVert #1 \\right\\rVert',
  '\\floor': '\\left\\lfloor #1 \\right\\rfloor',
  '\\ceil': '\\left\\lceil #1 \\right\\rceil',
  '\\eps': '\\varepsilon',

  // Derivate (stile pacchetto physics)
  '\\dd': '\\mathop{}\\!\\mathrm{d}',
  '\\dv': '\\frac{\\mathrm{d} #1}{\\mathrm{d} #2}',
  '\\pdv': '\\frac{\\partial #1}{\\partial #2}',
  '\\grad': '\\nabla',
  '\\curl': '\\nabla\\times',

  // Operatori
  '\\sgn': op('sgn'),
  '\\sign': op('sgn'),
  '\\rank': op('rank'),
  '\\rk': op('rk'),
  '\\Tr': op('Tr'),
  '\\tr': op('tr'),
  '\\id': op('id'),
  '\\Id': op('Id'),
  '\\span': op('span'),
  '\\Span': op('Span'),
  '\\lcm': op('lcm'),
  '\\mcd': op('MCD'),
  '\\mcm': op('mcm'),
  '\\Hom': op('Hom'),
  '\\Ker': op('Ker'),
  '\\im': op('Im'),
  '\\Imm': op('Im'),
  '\\rot': op('rot'),
  '\\diver': op('div'),
  '\\Res': op('Res'),
  '\\supp': op('supp'),
  '\\diag': op('diag'),
  '\\arcsinh': op('arcsinh'),
  '\\arccosh': op('arccosh'),
  '\\arctanh': op('arctanh'),
  '\\settsinh': op('settsinh'),
  '\\settcosh': op('settcosh'),
  // Notazione italiana
  '\\sen': op('sen'),
  '\\arcsen': op('arcsen'),
  '\\arctg': op('arctg'),

  // Logica e teoria dei numeri
  '\\divides': '\\mid',
  '\\ndivides': '\\nmid',
  '\\defeq': '\\coloneqq',
  '\\qed': '\\blacksquare',
  '\\QED': '\\blacksquare',
  '\\lightning': '\\text{↯}',
  '\\contradiction': '\\text{↯}',

  // Varie
  '\\hdots': '\\ldots',
  '\\celsius': '{}^{\\circ}\\mathrm{C}',
  '\\textdegree': '{}^{\\circ}',
  '\\euro': '\\text{€}',
  '\\EUR': '\\text{€}',
};

/* ---------- Comandi personali (dalle impostazioni dell'igloo) ---------- */

let userMacros: Record<string, string> = {};
let version = 0;
const listeners = new Set<() => void>();

/** Numero di argomenti usati nel corpo (#1, #2…). */
export const argCount = (body: string) => Math.max(0, ...[...body.matchAll(/#(\d)/g)].map((m) => +m[1]));

export const validCommandName = (name: string) => /^[a-zA-Z]+$/.test(name);

export function setUserMacros(list: { name: string; body: string }[] | undefined) {
  const next: Record<string, string> = {};
  for (const c of list ?? []) {
    const name = c.name.trim().replace(/^\\/, '');
    if (validCommandName(name) && c.body.trim()) next['\\' + name] = c.body;
  }
  if (JSON.stringify(next) === JSON.stringify(userMacros)) return;
  userMacros = next;
  version++;
  listeners.forEach((l) => l());
}

/** Per useSyncExternalStore: cambia quando cambiano i comandi personali. */
export const macrosStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getVersion: () => version,
};

/** Si ri-renderizza quando cambiano i comandi personali. */
export const useMacrosVersion = () => useSyncExternalStore(macrosStore.subscribe, macrosStore.getVersion);

/** Tutti i macro: quelli dell'app più quelli personali (che hanno la precedenza). */
export function allMacros(): Record<string, string> {
  return { ...KATEX_MACROS, ...userMacros };
}

/**
 * Opzioni comuni per KaTeX. I macro vengono copiati a ogni chiamata: così un \gdef
 * scritto in una nota non "contamina" le altre.
 */
export function katexOptions(display = false) {
  return {
    throwOnError: false,
    strict: false,
    trust: false,
    displayMode: display,
    macros: allMacros(),
  };
}
