import { Link } from 'react-router-dom';
import Penguin from '../components/Penguin';
import Markdown from '../components/Markdown';
import CheatSheet, { Kbd } from '../components/CheatSheet';
import { COSMETICS, SLOT_LABELS, type CosmeticSlot } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

const FORMAT_EXAMPLES: [string, string][] = [
  ['**grassetto**', 'Grassetto'],
  ['*corsivo*', 'Corsivo'],
  ['==evidenziato==', 'Evidenziatore giallo'],
  ['- primo punto\n- secondo punto', 'Elenco puntato'],
  ['1. primo\n2. secondo', 'Elenco numerato'],
  ['La derivata $f\'(x)$ esiste', 'Formula in linea'],
  ['$$\\int_a^b f(x)\\,dx$$', 'Formula a blocco'],
  ['Vedi [[Teorema di Weierstrass]]', 'Collegamento a un altro elemento'],
];

const CALLOUTS: [string, string][] = [
  ['nota', 'Nota'],
  ['teorema', 'Teorema'],
  ['definizione', 'Definizione'],
  ['dimostrazione', 'Dimostrazione'],
  ['esempio', 'Esempio'],
  ['attenzione', 'Attenzione'],
];

function Section({ id, emoji, title, children }: { id: string; emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 p-5 sm:p-6 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-4">
      <h3 className="text-xl font-bold">
        <span aria-hidden>{emoji}</span> {title}
      </h3>
      {children}
    </section>
  );
}

function ShortcutRow({ keys, children }: { keys: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <span className="w-40 shrink-0 flex flex-wrap gap-1">{keys}</span>
      <span className="text-ink/80">{children}</span>
    </li>
  );
}

const TOC = [
  ['scrivere', '✏️', 'Scrivere bene'],
  ['latex', '🧮', 'Formule veloci'],
  ['tastiera', '⌨️', 'Scorciatoie'],
  ['materie', '📚', 'Materie e ricerca'],
  ['ripasso', '🃏', 'Ripasso'],
  ['pomodoro', '🍅', 'Pomodoro'],
  ['igloo', '🏠', 'Igloo e pinguini'],
  ['consigli', '💡', 'Consigli'],
] as const;

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-br from-penguin-blue-soft to-penguin-pink-soft border border-penguin-blue-soft">
        <Penguin color="blue" cosmetics={{ viso: 'occhiali', pinna: 'libro', testa: 'tocco' }} className="w-20 h-24 shrink-0" />
        <div>
          <h2 className="text-2xl font-bold">La guida del pinguino</h2>
          <p className="text-ink/70 text-sm mt-1">
            Tutto quello che Penguin Study sa fare, spiegato da un pinguino che ha già passato Analisi 1.
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Indice della guida">
        {TOC.map(([id, e, t]) => (
          <a key={id} href={`#${id}`} className="px-3 py-1.5 rounded-full bg-white/80 border border-penguin-blue-soft text-sm hover:bg-penguin-blue-soft">
            {e} {t}
          </a>
        ))}
      </nav>

      <Section id="scrivere" emoji="✏️" title="Scrivere bene">
        <p className="text-ink/80">
          Enunciati e dimostrazioni si scrivono in <b>Markdown</b>, come su Obsidian. A sinistra quello che scrivi, a
          destra come appare. Premi <b>👁</b> sopra l'editor per vedere l'anteprima completa mentre scrivi.
        </p>
        <div className="rounded-2xl border border-penguin-blue-soft overflow-hidden divide-y divide-penguin-blue-soft">
          {FORMAT_EXAMPLES.map(([src, label]) => (
            <div key={src} className="grid sm:grid-cols-[1fr_1fr] gap-2 p-3 bg-white">
              <div>
                <p className="text-[11px] text-ink/50 mb-0.5">{label}</p>
                <pre className="font-mono text-[13px] whitespace-pre-wrap text-penguin-blue-dark">{src}</pre>
              </div>
              <Markdown className="text-sm">{src}</Markdown>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Riquadri colorati (callout)</p>
          <p className="text-sm text-ink/70">
            Inizia una riga con <code>{'> [!tipo] Titolo'}</code> e continua sotto con altre righe che iniziano con{' '}
            <code>{'>'}</code>. Tipi disponibili:
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {CALLOUTS.map(([k, t]) => (
              <Markdown key={k} className="text-sm">{`> [!${k}] ${t}\n> Scritto con \`[!${k}]\``}</Markdown>
            ))}
          </div>
        </div>
      </Section>

      <Section id="latex" emoji="🧮" title="Formule veloci (stile LaTeX Suite)">
        <p className="text-ink/80">
          Scrivi la sigla e il pinguino la trasforma da solo nel comando LaTeX. Dentro le formule i colori ti aiutano a
          orientarti: <span className="cm-m-cmd font-mono">\comandi</span> viola,{' '}
          <span className="cm-m-num font-mono">numeri</span> arancioni,{' '}
          <span className="cm-m-brace font-mono">{'{ } ^ _'}</span> rosa,{' '}
          <span className="cm-m-delim font-mono">$</span> blu. Sotto l'editor compare l'anteprima della formula in cui hai
          il cursore.
        </p>
        <CheatSheet />
        <p className="text-sm text-ink/70">
          📱 <b>Su iPad</b>, mentre scrivi compare una riga di tasti matematici (frazione, potenza, ∫, Σ, lettere greche…):
          toccali per inserire il simbolo.
        </p>
      </Section>

      <Section id="tastiera" emoji="⌨️" title="Scorciatoie da tastiera">
        <div className="grid sm:grid-cols-2 gap-x-6">
          <div>
            <p className="font-semibold mb-1">Nell'editor</p>
            <ul className="text-sm divide-y divide-ink/5">
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>B</Kbd></>}>Grassetto</ShortcutRow>
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>I</Kbd></>}>Corsivo</ShortcutRow>
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>⇧</Kbd><Kbd>H</Kbd></>}>Evidenzia</ShortcutRow>
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>M</Kbd></>}>Metti la selezione in una formula</ShortcutRow>
              <ShortcutRow keys={<Kbd>Invio</Kbd>}>Vai a capo</ShortcutRow>
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>Invio</Kbd></>}>Salva l'elemento</ShortcutRow>
              <ShortcutRow keys={<Kbd>Tab</Kbd>}>Campo successivo di uno snippet</ShortcutRow>
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>Z</Kbd></>}>Annulla</ShortcutRow>
              <ShortcutRow keys={<Kbd>Esc</Kbd>}>Chiudi la scheda senza salvare</ShortcutRow>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Ovunque</p>
            <ul className="text-sm divide-y divide-ink/5">
              <ShortcutRow keys={<><Kbd>{MOD}</Kbd><Kbd>K</Kbd></>}>Cerca in tutte le materie</ShortcutRow>
              <ShortcutRow keys={<><Kbd>↑</Kbd><Kbd>↓</Kbd><Kbd>Invio</Kbd></>}>Scegli un risultato della ricerca</ShortcutRow>
            </ul>
            <p className="font-semibold mb-1 mt-4">Nel ripasso</p>
            <ul className="text-sm divide-y divide-ink/5">
              <ShortcutRow keys={<Kbd>Spazio</Kbd>}>Gira la carta</ShortcutRow>
              <ShortcutRow keys={<Kbd>1</Kbd>}>🔴 Non la so</ShortcutRow>
              <ShortcutRow keys={<Kbd>2</Kbd>}>🟡 Così così</ShortcutRow>
              <ShortcutRow keys={<Kbd>3</Kbd>}>🟢 La so!</ShortcutRow>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="materie" emoji="📚" title="Materie, capitoli e ricerca">
        <ul className="list-disc pl-5 space-y-1.5 text-ink/80">
          <li>
            <b>Colore della materia:</b> dentro una materia tocca il pinguino accanto al nome per farlo blu o rosa.
          </li>
          <li>
            <b>Riordinare:</b> con "Ordine manuale" trascina le schede (su iPad tieni premuto un attimo) e i capitoli
            dalla maniglia ⋮⋮. Doppio clic sul nome di un capitolo per rinominarlo.
          </li>
          <li>
            <b>Cercare:</b> la barra in alto nella materia cerca in titoli, enunciati e dimostrazioni, anche senza
            accenti o comandi LaTeX (cercando "limite" trova anche <code>\lim</code>). Puoi ordinare in modo
            alfabetico o per data.
          </li>
          <li>
            <b>Filtri:</b> per tipo (definizione, teorema…), per stato 🔴 da studiare · 🟡 ripassato · 🟢
            padroneggiato, e "solo con dimostrazione".
          </li>
          <li>
            <b>Cambiare lo stato al volo:</b> tasto destro su una scheda (su iPad tocca il pallino colorato) e scegli 🔴 da
            studiare, 🟡 ripassato o 🟢 padroneggiato.
          </li>
          <li>
            <b>Data d'esame:</b> tocca "📅 Imposta la data d'esame" sotto il nome. Il giorno dell'esame il pinguino ti fa
            il tifo, e con "Passato! 🎉" partono i coriandoli.
          </li>
          <li>
            <b>PDF:</b> il pulsante 🖨️ PDF apre una versione da stampare o salvare come PDF.
          </li>
          <li>
            <b>Importare da un'IA:</b> in Impostazioni copia il prompt, dallo a Claude o ChatGPT insieme al PDF degli
            appunti, poi usa "Importa JSON" nella materia.
          </li>
        </ul>
      </Section>

      <Section id="ripasso" emoji="🃏" title="Ripasso a flashcard">
        <p className="text-ink/80">
          Nella materia premi <b>🃏 Ripasso</b> e scegli <b>quali carte</b> vuoi: accendi uno o più colori (vedi subito
          quante carte ci sono per ciascuno), scegli i capitoli e, se vuoi, solo quelle con dimostrazione. L'app si
          ricorda la tua ultima scelta.
        </p>
        <p className="text-ink/80">
          Leggi il titolo, prova a ricordare l'enunciato (e la dimostrazione), gira la carta e rispondi sinceramente: la
          risposta <b>decide il colore</b> della carta.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-3 rounded-2xl bg-rose-100 text-rose-800">
            <b>🔴 Non la so</b>
            <br />diventa rossa e la riprovi a fine giro
          </div>
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-800">
            <b>🟡 Così così</b>
            <br />diventa gialla
          </div>
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
            <b>🟢 La so!</b>
            <br />diventa verde
          </div>
        </div>
        <p className="text-sm text-ink/70">
          Alla fine vedi il riepilogo (quante verdi, gialle e rosse) e puoi ripassare subito solo quelle rosse. Il
          bottone <b>📅 Da ripassare oggi</b> invece lascia scegliere al pinguino: le carte mai ripassate e quelle che,
          in base alle risposte passate, è ora di rivedere (più una carta la sai, più tardi torna).
        </p>
      </Section>

      <Section id="pomodoro" emoji="🍅" title="Pomodoro, pesciolini e calendario">
        <ul className="list-disc pl-5 space-y-1.5 text-ink/80">
          <li>
            Scegli la materia e premi <b>Avvia</b>. Puoi cambiare pagina: il timer resta nella barra in alto con
            <Kbd>⏸</Kbd> pausa, <Kbd>⏭</Kbd> salta e <Kbd>↺</Kbd> ricomincia.
          </li>
          <li>
            Ogni pomodoro completato vale <b>un pesciolino 🐟</b> (due nel compleanno del vostro pinguino!). Saltarlo con
            ⏭ non vale.
          </li>
          <li>
            Il <b>calendario</b> in fondo alla pagina mostra quanto avete studiato ogni giorno, il monte ore e la media. Contano i pomodori e le ore aggiunte a mano; il ripasso a flashcard no, perché di solito lo fai già dentro un pomodoro.
            Con "+ Aggiungi ore" segni anche lo studio fatto senza timer.
          </li>
          <li>
            Mentre il timer va, la tua metà vede "📚 sta studiando". Se studiate insieme, i pinguini si guardano con gli
            occhi a cuore 💞
          </li>
        </ul>
      </Section>

      <Section id="igloo" emoji="🏠" title="Igloo, pinguini e sorprese">
        <ul className="list-disc pl-5 space-y-1.5 text-ink/80">
          <li>
            <b>Igloo condiviso:</b> uno crea l'igloo e invita l'altra persona con l'email; l'altra accetta l'invito.
            Pomodori, pesciolini e bigliettini diventano condivisi.
          </li>
          <li>
            <b>Bigliettini 💌:</b> scrivi un messaggio nell'Igloo: all'altra persona appare appena apre l'app (e arriva una
            notifica se le ha attivate).
          </li>
          <li>
            <b>Il vostro pinguino:</b> ha fame se non studiate da un po', è felice dopo un pomodoro e al settimo cielo dopo
            una giornata intensa.
          </li>
          <li>
            <b>Date speciali:</b> anniversario, mesiversario ogni 22, compleanno del pinguino, San Valentino e Natale
            hanno una sorpresa.
          </li>
        </ul>
        <div>
          <p className="font-semibold mb-2">Cosmetici da sbloccare con i pesciolini</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(SLOT_LABELS) as CosmeticSlot[]).map((slot) => (
              <div key={slot} className="rounded-2xl bg-white border border-penguin-blue-soft p-3">
                <p className="font-medium text-sm mb-2">{SLOT_LABELS[slot]}</p>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {COSMETICS.filter((c) => c.slot === slot).map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <Penguin color="pink" cosmetics={{ [slot]: c.id }} className="w-6 h-7 shrink-0" />
                      <span className="flex-1 truncate">{c.label}</span>
                      <span className="text-ink/50 tabular-nums text-xs">{c.fish}🐟</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="consigli" emoji="💡" title="Consigli del pinguino">
        <ul className="list-disc pl-5 space-y-1.5 text-ink/80">
          <li>
            📱 Su iPad e iPhone aggiungi il sito alla <b>schermata Home</b> (Safari → Condividi → Aggiungi alla schermata
            Home): funziona offline, riceve le notifiche e i dati non vengono cancellati.
          </li>
          <li>☁️ Con l'accesso i dati si sincronizzano da soli su tutti i dispositivi, anche dopo aver studiato offline.</li>
          <li>
            🧭 Puoi saltare su Igloo o Pomodoro quando vuoi: tornando su <b>Materie</b> ritrovi la materia, la scheda che
            stavi scrivendo o il ripasso esattamente dove li avevi lasciati. Se l'app si chiude mentre scrivi, la bozza
            riappare quando riapri la materia.
          </li>
          <li>
            💾 Ogni tanto fai un <b>backup</b> da <Link to="/impostazioni" className="underline">Impostazioni</Link>: non si sa
            mai.
          </li>
          <li>🐟 Un pomodoro al giorno toglie il pinguino affamato di torno.</li>
        </ul>
      </Section>
    </div>
  );
}
