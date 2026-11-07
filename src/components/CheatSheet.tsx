import katex from 'katex';
import { AUTO_COMMANDS, SNIPPETS } from './editor/latexSuite';

/** Corpo dello snippet "pulito" per l'anteprima: i campi diventano un esempio leggibile. */
function preview(body: string) {
  const letters: Record<string, string> = { '1': 'x', '2': 'y', '3': 'z', '4': 'x' };
  return (/^[\^_]/.test(body) ? 'x' + body : body) // potenze: mostra anche la base
    .replace(/\$\{\d+\}$/, '') // l'ultimo campo vuoto in fondo è solo la posizione del cursore
    .replace(/\\text\{\$\{\d+\}\}/g, '\\text{testo}')
    .replace(/\$\{(\d+)(?::([^}]*))?\}/g, (_m, n, def) => def ?? letters[n] ?? 'x')
    .replace(/\n/g, ' ');
}

function Tex({ src }: { src: string }) {
  let html = '';
  try {
    html = katex.renderToString(src, { throwOnError: false, strict: false });
  } catch {
    html = src;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const GROUPS: { title: string; emoji: string; triggers: string[] }[] = [
  { title: 'Frazioni, radici e potenze', emoji: '🧮', triggers: ['//', 'sq', 'sr', 'cb', 'rd', 'ee'] },
  { title: 'Limiti, somme e integrali', emoji: '♾️', triggers: ['lim', 'sum', 'prod', 'dint', 'inf'] },
  { title: 'Relazioni e frecce', emoji: '➡️', triggers: ['->', '=>', '<=>', '!=', '/=', '<=', '>=', '~~', 'xx', '**', '...'] },
  { title: 'Insiemi e logica', emoji: '🧊', triggers: ['RR', 'NN', 'ZZ', 'QQ', 'CC', 'AA', 'EE', 'inn', 'notin', 'sub', 'cup', 'cap', 'set'] },
  { title: 'Valori assoluti, norme e stili', emoji: '🎀', triggers: ['abs', 'norm', 'bf', 'cal', 'text', 'ol', 'hat'] },
];

const kbd = 'inline-block min-w-7 px-1.5 py-0.5 rounded-md bg-white border border-ink/15 shadow-[0_1px_0_rgba(0,0,0,0.08)] font-mono text-[13px] text-center';

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={kbd}>{children}</kbd>;
}

/** Tabella delle scorciatoie LaTeX. `compact` = versione ridotta dentro l'editor. */
export default function CheatSheet({ compact = false }: { compact?: boolean }) {
  const byTrigger = new Map(SNIPPETS.map((s) => [s.trigger, s]));
  const greek = SNIPPETS.filter((s) => s.trigger.startsWith('@'));
  const words = (list: string[]) => list.filter((w) => byTrigger.get(w)?.auto);

  return (
    <div className={compact ? 'space-y-3 text-sm' : 'space-y-5'}>
      <div className={`rounded-2xl bg-penguin-pink-soft/60 border border-penguin-pink/40 ${compact ? 'p-3' : 'p-4'} space-y-1.5`}>
        <p className="font-semibold">✏️ Fuori dalle formule</p>
        <p>
          <Kbd>mk</Kbd> → formula in linea <code className="text-penguin-pink-dark">$…$</code> &nbsp;·&nbsp; <Kbd>dm</Kbd> →
          formula a blocco <code className="text-penguin-pink-dark">$$…$$</code>
        </p>
        <p className="text-ink/60 text-[13px]">
          Le scorciatoie qui sotto funzionano solo <b>dentro</b> una formula. Dopo uno snippet premi <Kbd>Tab</Kbd> per
          saltare al campo successivo (es. dal numeratore al denominatore).
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {GROUPS.map((g) => (
          <section key={g.title} className="rounded-2xl bg-white border border-penguin-blue-soft p-3">
            <h4 className="font-semibold mb-2">
              {g.emoji} {g.title}
            </h4>
            <ul className="space-y-1">
              {g.triggers.map((t) => {
                const s = byTrigger.get(t);
                if (!s) return null;
                return (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-16 shrink-0">
                      <Kbd>{t}</Kbd>
                    </span>
                    <span className="flex-1 min-w-0 overflow-hidden">
                      <Tex src={preview(s.body)} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl bg-white border border-penguin-blue-soft p-3">
        <h4 className="font-semibold mb-2">🐧 Lettere greche: chiocciola + lettera</h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-1">
          {greek.map((s) => (
            <span key={s.trigger} className="flex items-center gap-2">
              <Kbd>{s.trigger}</Kbd>
              <Tex src={s.body} />
            </span>
          ))}
        </div>
        <p className="text-[13px] text-ink/60 mt-2">Maiuscola = lettera maiuscola: @d → δ, @D → Δ.</p>
      </section>

      <section className="rounded-2xl bg-white border border-penguin-blue-soft p-3 space-y-2">
        <h4 className="font-semibold">🔤 Parole che diventano comandi</h4>
        <p className="text-[13px] text-ink/70">
          Dentro una formula scrivi il nome del comando <b>senza</b> backslash e diventa un comando da solo, con le graffe già
          aperte se servono: <Kbd>bar</Kbd> → <Tex src="\bar{x}" />, <Kbd>tilde</Kbd> → <Tex src="\tilde{x}" />,{' '}
          <Kbd>alpha</Kbd> → <Tex src="\alpha" />, <Kbd>sin</Kbd> → <Tex src="\sin" />. Dentro <code>{'\\text{…}'}</code>{' '}
          le parole restano parole.
        </p>
        {!compact && (
          <div className="space-y-1.5 text-[13px]">
            <p>
              <b>Con graffe:</b>{' '}
              {[...words(AUTO_COMMANDS.oneArg), ...words(AUTO_COMMANDS.twoArgs)].map((w) => (
                <span key={w} className="inline-block mr-1 mb-1">
                  <Kbd>{w}</Kbd>
                </span>
              ))}
            </p>
            <p>
              <b>Simboli e funzioni:</b>{' '}
              {words(AUTO_COMMANDS.symbols).map((w) => (
                <span key={w} className="inline-block mr-1 mb-1">
                  <Kbd>{w}</Kbd>
                </span>
              ))}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-penguin-blue-soft p-3 space-y-1">
        <h4 className="font-semibold mb-1">🪄 Automatici</h4>
        <p>
          <Kbd>^</Kbd> e <Kbd>_</Kbd> aprono subito le graffe: <Kbd>x^2</Kbd> → <Tex src="x^{2}" />. Per uscire premi{' '}
          <Kbd>Tab</Kbd> oppure scrivi <Kbd>{'}'}</Kbd>
        </p>
        <p>
          <Kbd>x1</Kbd> → <Tex src="x_1" /> &nbsp; una lettera seguita da un numero diventa un pedice
        </p>
        <p>
          <Kbd>(</Kbd> <Kbd>[</Kbd> <Kbd>{'{'}</Kbd> <Kbd>$</Kbd> si chiudono da soli
        </p>
      </section>
    </div>
  );
}
