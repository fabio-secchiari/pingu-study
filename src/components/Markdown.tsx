import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { plain } from '../lib/text';

/* ---------- plugin remark minimali (niente dipendenze extra) ---------- */

/** ==evidenziato== e [[collegamento a un elemento]] dentro i nodi di testo. */
function remarkObsidianInline() {
  const RE = /==([^=\n]+)==|\[\[([^\]\n]+)\]\]/g;
  const walk = (node: any) => {
    if (!node.children) return;
    const out: any[] = [];
    for (const child of node.children) {
      if (child.type !== 'text') {
        walk(child);
        out.push(child);
        continue;
      }
      const value: string = child.value;
      let last = 0;
      for (const m of value.matchAll(RE)) {
        if (m.index! > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        if (m[1] !== undefined) {
          out.push({ type: 'mark', data: { hName: 'mark' }, children: [{ type: 'text', value: m[1] }] });
        } else {
          out.push({
            type: 'link',
            url: 'item:' + encodeURIComponent(m[2].trim()),
            children: [{ type: 'text', value: m[2].trim() }],
          });
        }
        last = m.index! + m[0].length;
      }
      if (last === 0) out.push(child);
      else if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    }
    node.children = out;
  };
  return (tree: any) => walk(tree);
}

const CALLOUT_LABELS: Record<string, string> = {
  note: 'Nota',
  nota: 'Nota',
  info: 'Info',
  tip: 'Suggerimento',
  attenzione: 'Attenzione',
  warning: 'Attenzione',
  definizione: 'Definizione',
  teorema: 'Teorema',
  esempio: 'Esempio',
  osservazione: 'Osservazione',
  dimostrazione: 'Dimostrazione',
};

/** Callout stile Obsidian: `> [!teorema] Titolo opzionale` */
function remarkCallouts() {
  const visit = (node: any) => {
    if (node.type === 'blockquote') {
      const para = node.children?.[0];
      const first = para?.type === 'paragraph' ? para.children?.[0] : null;
      const m = first?.type === 'text' ? /^\[!(\w+)\][+-]?[ \t]*([^\n]*)\n?/.exec(first.value) : null;
      if (m) {
        const kind = m[1].toLowerCase();
        first.value = first.value.slice(m[0].length);
        if (!first.value) para.children.shift();
        if (para.children[0]?.type === 'break') para.children.shift();
        if (para.children.length === 0) node.children.shift();
        node.data = { hName: 'div', hProperties: { className: ['callout', `callout-${kind}`] } };
        node.children.unshift({
          type: 'paragraph',
          data: { hProperties: { className: ['callout-title'] } },
          children: [{ type: 'text', value: m[2] || CALLOUT_LABELS[kind] || kind }],
        });
      }
    }
    node.children?.forEach(visit);
  };
  return (tree: any) => visit(tree);
}

/** Mette i `$$...$$` scritti in mezzo al testo su righe proprie, così diventano blocchi. */
function normalizeDisplayMath(src: string): string {
  return src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, x: string) => `\n\n$$\n${x.trim()}\n$$\n\n`);
}

/* ---------- collegamenti [[...]] ---------- */

function ItemLink({ title, children }: { title: string; children: React.ReactNode }) {
  const nav = useNavigate();
  const open = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = plain(title);
    const found = await db.items.filter((i) => plain(i.title) === target).first();
    if (found) nav(`/subject/${found.subjectId}?item=${found.id}`);
    else alert(`Nessun elemento intitolato "${title}"`);
  };
  return (
    <a href="#" onClick={open} className="wikilink">
      {children}
    </a>
  );
}

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith('item:')) {
      return <ItemLink title={decodeURIComponent(href.slice(5))}>{children}</ItemLink>;
    }
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
};

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks, remarkCallouts, remarkObsidianInline];
const rehypePlugins: any[] = [[rehypeKatex, { throwOnError: false, strict: false }]];

const safeUrl = (url: string) =>
  /^(item:|https?:|mailto:|#)/i.test(url) ? url : '';

interface Props {
  children: string;
  className?: string;
}

function MarkdownImpl({ children, className }: Props) {
  const src = useMemo(() => normalizeDisplayMath(children ?? ''), [children]);
  return (
    <div className={`prose-penguin ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={rehypePlugins}
        components={components}
        urlTransform={safeUrl}
      >
        {src}
      </ReactMarkdown>
    </div>
  );
}

const Markdown = memo(MarkdownImpl);
export default Markdown;
