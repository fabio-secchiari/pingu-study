import { useEffect, useState } from 'react';
import katex from 'katex';
import { saveIgloo, useIgloo } from '../lib/cloud';
import { argCount, KATEX_MACROS, katexOptions, validCommandName } from '../lib/katexMacros';
import { SNIPPETS } from './editor/latexSuite';
import type { CustomCommand, CustomSnippet } from '../types';

const input = 'px-2.5 py-1.5 rounded-xl border border-penguin-blue-soft bg-white font-mono text-sm min-w-0';

function Tex({ src, extra }: { src: string; extra?: Record<string, string> }) {
  let html = '';
  try {
    const opts = katexOptions(false);
    html = katex.renderToString(src, { ...opts, macros: { ...opts.macros, ...extra }, throwOnError: true });
  } catch (e) {
    return <span className="text-xs text-red-600">{(e as Error).message.replace(/^KaTeX parse error: /, '').slice(0, 60)}</span>;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Il comando esiste già in KaTeX (o tra quelli aggiunti dall'app)? */
function isBuiltin(name: string) {
  if (KATEX_MACROS['\\' + name]) return true;
  try {
    katex.renderToString('\\' + name, { throwOnError: true, strict: false });
    return true;
  } catch (e) {
    return !/Undefined control sequence/.test((e as Error).message);
  }
}

const EXAMPLE_COMMANDS: CustomCommand[] = [
  { name: 'P', body: '\\mathbb{P}' },
  { name: 'E', body: '\\mathbb{E}' },
  { name: 'Var', body: '\\operatorname{Var}' },
  { name: 'inner', body: '\\langle #1, #2 \\rangle' },
  { name: 'vett', body: '\\underline{#1}' },
];

const EXAMPLE_SNIPPETS: CustomSnippet[] = [
  { trigger: 'pp', body: '\\mathbb{P}(${1})${2}' },
  { trigger: 'iid', body: '\\text{ i.i.d. }' },
  { trigger: 'cvd', body: '$\\blacksquare$', anywhere: true },
];

const usage = (c: CustomCommand) => {
  const n = argCount(c.body);
  return '\\' + c.name + Array.from({ length: n }, (_, i) => `{${'abcdefghi'[i]}}`).join('');
};

/** Il corpo di uno snippet com'è dopo l'espansione, con i campi riempiti da esempi. */
const snippetPreview = (body: string) =>
  body
    .replace(/\$\{\d+\}$/, '') // l'ultimo campo vuoto è solo dove finisce il cursore
    .replace(/\$\{(\d+)(?::([^}]*))?\}/g, (_m, _n, def) => def ?? 'x');

export default function CustomLatexSettings() {
  const igloo = useIgloo();
  const [cmds, setCmds] = useState<CustomCommand[]>([]);
  const [snips, setSnips] = useState<CustomSnippet[]>([]);
  const [saved, setSaved] = useState(false);

  const savedCmds = JSON.stringify(igloo.customCommands ?? []);
  const savedSnips = JSON.stringify(igloo.customSnippets ?? []);
  // Quando arrivano i dati (o li cambia l'altra persona) riparto da quelli salvati
  useEffect(() => setCmds(JSON.parse(savedCmds)), [savedCmds]);
  useEffect(() => setSnips(JSON.parse(savedSnips)), [savedSnips]);

  const cleanCmds = cmds
    .map((c) => ({ name: c.name.trim().replace(/^\\/, ''), body: c.body.trim() }))
    .filter((c) => c.name && c.body);
  const cleanSnips = snips
    .map((s) => ({ trigger: s.trigger.trim(), body: s.body, ...(s.anywhere ? { anywhere: true } : {}) }))
    .filter((s) => s.trigger && s.body);
  const dirty = JSON.stringify(cleanCmds) !== savedCmds || JSON.stringify(cleanSnips) !== savedSnips;
  const invalid = cleanCmds.some((c) => !validCommandName(c.name));

  const save = async () => {
    await saveIgloo({ customCommands: cleanCmds, customSnippets: cleanSnips });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setCmd = (i: number, patch: Partial<CustomCommand>) =>
    setCmds((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setSnip = (i: number, patch: Partial<CustomSnippet>) =>
    setSnips((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const appTriggers = new Set(SNIPPETS.map((s) => s.trigger));

  return (
    <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-5">
      <div>
        <h3 className="font-semibold">🧩 Comandi LaTeX personali</h3>
        <p className="text-sm text-ink/60 mt-1">
          Valgono per entrambi nell'igloo e su tutti i dispositivi. Usa <code>#1</code>, <code>#2</code>… per gli
          argomenti: <code>{'\\inner'}</code> → <code>{'\\langle #1, #2 \\rangle'}</code> si usa come{' '}
          <code>{'\\inner{u}{v}'}</code>.
        </p>
      </div>

      <div className="space-y-2">
        {cmds.map((c, i) => {
          const name = c.name.trim().replace(/^\\/, '');
          const bad = !!name && !validCommandName(name);
          const overrides = !!name && !bad && isBuiltin(name);
          return (
            <div key={i} className="rounded-2xl border border-ink/10 p-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-ink/50">\</span>
                <input
                  value={c.name}
                  onChange={(e) => setCmd(i, { name: e.target.value.replace(/^\\/, '') })}
                  placeholder="nome"
                  aria-label="Nome del comando"
                  className={`${input} w-24 ${bad ? 'border-red-400' : ''}`}
                />
                <span className="text-ink/40">→</span>
                <input
                  value={c.body}
                  onChange={(e) => setCmd(i, { body: e.target.value })}
                  placeholder="\mathbb{P}"
                  aria-label="Cosa diventa"
                  className={`${input} flex-1`}
                />
                <button
                  onClick={() => setCmds((l) => l.filter((_, j) => j !== i))}
                  className="w-8 h-8 rounded-full text-ink/40 hover:text-red-600 hover:bg-red-50"
                  aria-label="Elimina comando"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-4 text-xs text-ink/60">
                {bad ? (
                  <span className="text-red-600">Il nome può contenere solo lettere (niente numeri, spazi o simboli).</span>
                ) : name && c.body.trim() ? (
                  <>
                    <code>{usage({ name, body: c.body })}</code> <span>→</span>
                    <Tex src={usage({ name, body: c.body })} extra={{ ['\\' + name]: c.body }} />
                    {overrides && <span className="text-amber-700">· sostituisce il comando che esiste già</span>}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCmds((l) => [...l, { name: '', body: '' }])}
            className="px-3 py-1.5 rounded-xl bg-penguin-blue-soft text-sm hover:bg-penguin-blue/30"
          >
            + Nuovo comando
          </button>
          <span className="text-xs text-ink/40 ml-1">Idee:</span>
          {EXAMPLE_COMMANDS.filter((x) => !cmds.some((c) => c.name === x.name)).map((x) => (
            <button
              key={x.name}
              onClick={() => setCmds((l) => [...l, x])}
              className="px-2 py-1 rounded-lg border border-dashed border-penguin-blue text-xs font-mono hover:bg-penguin-blue-soft"
            >
              \{x.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm">⚡ Scorciatoie personali dell'editor</h4>
        <p className="text-sm text-ink/60 mt-1">
          Scrivi il trigger dentro una formula e diventa il testo che vuoi, come <b>sq</b> → √. Con{' '}
          <code>{'${1}'}</code>, <code>{'${2}'}</code>… crei dei campi in cui saltare con Tab.
        </p>
      </div>
      <div className="space-y-2">
        {snips.map((s, i) => {
          const t = s.trigger.trim();
          return (
            <div key={i} className="rounded-2xl border border-ink/10 p-2 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  value={s.trigger}
                  onChange={(e) => setSnip(i, { trigger: e.target.value.replace(/\s/g, '') })}
                  placeholder="pp"
                  aria-label="Trigger"
                  className={`${input} w-20`}
                />
                <span className="text-ink/40">→</span>
                <input
                  value={s.body}
                  onChange={(e) => setSnip(i, { body: e.target.value })}
                  placeholder="\mathbb{P}(${1})"
                  aria-label="Testo inserito"
                  className={`${input} flex-1 min-w-40`}
                />
                <button
                  onClick={() => setSnips((l) => l.filter((_, j) => j !== i))}
                  className="w-8 h-8 rounded-full text-ink/40 hover:text-red-600 hover:bg-red-50"
                  aria-label="Elimina scorciatoia"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-1 text-xs text-ink/60">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!s.anywhere} onChange={(e) => setSnip(i, { anywhere: e.target.checked })} />
                  anche fuori dalle formule
                </label>
                {t && s.body && !s.anywhere && (
                  <span>
                    → <Tex src={snippetPreview(s.body)} />
                  </span>
                )}
                {appTriggers.has(t) && <span className="text-amber-700">sostituisce la scorciatoia dell'app "{t}"</span>}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSnips((l) => [...l, { trigger: '', body: '' }])}
            className="px-3 py-1.5 rounded-xl bg-penguin-blue-soft text-sm hover:bg-penguin-blue/30"
          >
            + Nuova scorciatoia
          </button>
          <span className="text-xs text-ink/40 ml-1">Idee:</span>
          {EXAMPLE_SNIPPETS.filter((x) => !snips.some((c) => c.trigger === x.trigger)).map((x) => (
            <button
              key={x.trigger}
              onClick={() => setSnips((l) => [...l, x])}
              className="px-2 py-1 rounded-lg border border-dashed border-penguin-blue text-xs font-mono hover:bg-penguin-blue-soft"
            >
              {x.trigger}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || invalid}
          className="px-4 py-2.5 rounded-2xl bg-penguin-blue text-white font-medium hover:bg-penguin-blue-dark disabled:opacity-40"
        >
          Salva
        </button>
        {saved && <span className="text-sm text-emerald-700">Salvato ✓</span>}
        {dirty && !saved && <span className="text-sm text-ink/50">Modifiche non salvate</span>}
      </div>
    </section>
  );
}
