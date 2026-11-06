import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import katex from 'katex';
import Markdown from '../Markdown';
import {
  insertSnippet,
  latexHighlighter,
  latexSnippets,
  prefixLines,
  wrapSelection,
  zoneAt,
} from './latexSuite';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Cmd/Ctrl+Invio */
  onSubmit?: () => void;
  tone?: 'blue' | 'pink';
  minHeight?: number;
  label?: string;
}

const PREVIEW_KEY = 'penguin-editor-preview';

const TOUCH_KEYS: { label: string; body: string }[] = [
  { label: 'a/b', body: '\\frac{${1}}{${2}}${3}' },
  { label: 'x²', body: '^{${1}}${2}' },
  { label: 'xₙ', body: '_{${1}}${2}' },
  { label: '√', body: '\\sqrt{${1}}${2}' },
  { label: '∫', body: '\\int_{${1:a}}^{${2:b}} ${3} \\, d${4:x}' },
  { label: 'Σ', body: '\\sum_{${1:n=1}}^{${2:\\infty}} ${3}' },
  { label: 'lim', body: '\\lim_{${1:n} \\to ${2:\\infty}} ${3}' },
  { label: 'α', body: '\\alpha' },
  { label: 'ε', body: '\\varepsilon' },
  { label: 'δ', body: '\\delta' },
  { label: '→', body: '\\to' },
  { label: '∞', body: '\\infty' },
  { label: '≤', body: '\\leq' },
  { label: '≥', body: '\\geq' },
  { label: '≠', body: '\\neq' },
  { label: '∈', body: '\\in' },
  { label: 'ℝ', body: '\\mathbb{R}' },
  { label: '∀', body: '\\forall' },
  { label: '∃', body: '\\exists' },
];

function renderKatex(src: string) {
  try {
    return katex.renderToString(src, { throwOnError: false, strict: false, displayMode: false });
  } catch {
    return '';
  }
}

export default function MathEditor({
  value,
  onChange,
  placeholder,
  onSubmit,
  tone = 'blue',
  minHeight = 120,
  label,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;

  const [formula, setFormula] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [preview, setPreview] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PREVIEW_KEY) === '1';
    } catch {
      return false;
    }
  });
  const isTouch = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, []);

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          EditorView.lineWrapping,
          cmPlaceholder(placeholder ?? ''),
          // Solo parentesi e $: niente apici (l'italiano usa l'apostrofo!)
          EditorState.languageData.of(() => [{ closeBrackets: { brackets: ['(', '[', '{', '$'] } }]),
          closeBrackets(),
          latexHighlighter,
          latexSnippets,
          Prec.high(
            keymap.of([
              { key: 'Mod-Enter', run: () => (onSubmitRef.current?.(), true) },
              { key: 'Mod-b', run: (v) => wrapSelection(v, '**') },
              { key: 'Mod-i', run: (v) => wrapSelection(v, '*') },
              { key: 'Mod-Shift-h', run: (v) => wrapSelection(v, '==') },
              { key: 'Mod-m', run: (v) => wrapSelection(v, '$') },
            ])
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
            if (u.docChanged || u.selectionSet) {
              const text = u.state.doc.toString();
              const z = zoneAt(text, u.state.selection.main.head);
              setFormula(z ? text.slice(z.from, z.to) : null);
            }
            if (u.focusChanged) setFocused(u.view.hasFocus);
          }),
          EditorView.contentAttributes.of({
            'aria-label': label ?? placeholder ?? 'Editor',
            autocapitalize: 'sentences',
            spellcheck: 'false',
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggiornamenti dall'esterno (es. reset del form)
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  const togglePreview = () => {
    setPreview((p) => {
      try {
        localStorage.setItem(PREVIEW_KEY, p ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !p;
    });
  };

  const run = (fn: (v: EditorView) => void) => () => {
    const v = viewRef.current;
    if (v) fn(v);
  };

  const ring = tone === 'pink' ? 'focus-within:ring-penguin-pink' : 'focus-within:ring-penguin-blue';
  const border = tone === 'pink' ? 'border-penguin-pink/50' : 'border-penguin-blue-soft';

  const btn =
    'min-w-9 h-9 px-2 rounded-xl text-sm text-ink/70 hover:bg-ink/5 active:bg-ink/10 transition-colors';

  return (
    <div className={`rounded-2xl bg-white border ${border} focus-within:ring-2 ${ring} overflow-hidden`}>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-ink/5 bg-white/80 overflow-x-auto">
        <button type="button" className={`${btn} font-bold`} onClick={run((v) => wrapSelection(v, '**'))} title="Grassetto (⌘B)">B</button>
        <button type="button" className={`${btn} italic font-serif`} onClick={run((v) => wrapSelection(v, '*'))} title="Corsivo (⌘I)">I</button>
        <button type="button" className={btn} onClick={run((v) => wrapSelection(v, '=='))} title="Evidenzia">
          <span className="px-1 rounded bg-yellow-200">ab</span>
        </button>
        <button type="button" className={btn} onClick={run((v) => prefixLines(v, '- '))} title="Elenco puntato">•≡</button>
        <span className="w-px h-5 bg-ink/10 mx-1" />
        <button type="button" className={`${btn} font-mono`} onClick={run((v) => insertSnippet(v, '$${1}$${2}'))} title="Formula in linea (mk)">$x$</button>
        <button type="button" className={`${btn} font-mono`} onClick={run((v) => insertSnippet(v, '\n$$\n${1}\n$$\n${2}'))} title="Formula a blocco (dm)">$$</button>
        <button type="button" className={btn} onClick={run((v) => insertSnippet(v, '\n> [!${1:nota}] ${2}\n> ${3}'))} title="Callout">❝</button>
        <button type="button" className={btn} onClick={run((v) => insertSnippet(v, '[[${1}]]${2}'))} title="Collega un elemento">🔗</button>
        <button
          type="button"
          onClick={togglePreview}
          aria-pressed={preview}
          title={preview ? 'Nascondi anteprima' : 'Mostra anteprima'}
          className={`${btn} ml-auto ${preview ? 'bg-penguin-blue-soft text-penguin-blue-dark' : ''}`}
        >
          👁
        </button>
      </div>

      <div ref={host} className="penguin-editor" style={{ minHeight }} />

      {formula !== null && formula.trim() !== '' && !preview && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-penguin-pink-soft/60 border border-penguin-pink/40 flex items-center gap-3 overflow-x-auto">
          <span className="text-[11px] font-medium text-penguin-pink-dark shrink-0">anteprima</span>
          <span dangerouslySetInnerHTML={{ __html: renderKatex(formula) }} />
        </div>
      )}

      {isTouch && focused && (
        <div className="flex gap-1 px-2 py-1.5 border-t border-ink/5 overflow-x-auto bg-penguin-blue-soft/30">
          {TOUCH_KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onPointerDown={(e) => e.preventDefault()} // non perdere il focus
              onClick={run((v) => insertSnippet(v, k.body))}
              className="shrink-0 min-w-10 h-9 px-2 rounded-lg bg-white border border-ink/10 text-sm"
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className="border-t border-ink/5 px-4 py-3 bg-penguin-blue-soft/20">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-ink/40">L'anteprima apparirà qui.</p>
          )}
        </div>
      )}
    </div>
  );
}
