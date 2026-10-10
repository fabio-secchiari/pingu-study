import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

function renderLatex(src: string, display: boolean): string {
  try {
    return katex.renderToString(src, {
      throwOnError: false,   // non esplode su input sporco
      displayMode: display,
      strict: false,
      trust: false,
    });
  } catch {
    return `<code>${src.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))}</code>`;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// $$...$$ (display, multiline) oppure $...$ (inline).
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function buildHtml(text: string): string {
  // Le formule vanno estratte dal testo originale: se si facesse l'escape HTML prima,
  // KaTeX riceverebbe `&lt;` al posto di `<`. Si fa l'escape solo del testo fra le formule.
  let out = '';
  let last = 0;
  for (const m of text.matchAll(MATH_RE)) {
    out += escapeHtml(text.slice(last, m.index));
    out += m[1] !== undefined ? renderLatex(m[1], true) : renderLatex(m[2], false);
    last = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

interface Props {
  children: string;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

export default function MathText({ children, className, as = 'span' }: Props) {
  const html = useMemo(() => buildHtml(children ?? ''), [children]);
  const Tag = as as any;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}