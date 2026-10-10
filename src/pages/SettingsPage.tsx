import { useRef, useState } from 'react';
import { db } from '../db';
import { downloadJson, exportBackup, importBackup } from '../lib/backup';
import { parseJsonLoose } from '../lib/schema';

const LLM_PROMPT = `Sei un assistente che estrae contenuti matematici da appunti/dispense PDF e li converte in un JSON rigorosamente conforme allo schema qui sotto.

REGOLE GENERALI
1. Rispondi SOLO con il JSON, senza commenti, senza markdown, senza \`\`\`json all'inizio o alla fine. Il testo che produci deve poter essere salvato direttamente in un file .json e importato senza modifiche.
2. Non inventare contenuti: estrai solo ciò che è effettivamente presente nel PDF. Se un'informazione manca, ometti il campo o lascialo vuoto secondo lo schema.
3. Mantieni la lingua originale del PDF (italiano).
4. Non tradurre, non riassumere, non parafrasare i contenuti matematici: riportali fedelmente. Puoi solo correggere refusi evidenti di OCR.
5. Tutti i comandi LaTeX devono avere il backslash raddoppiato nel JSON (\\\\rightarrow invece di \\rightarrow, \\\\mathcal{P} invece di \\mathcal{P}, ecc.). Nel JSON non deve mai comparire un singolo backslash prima di una lettera.
6. Dividi per capitoli come sono strutturati nel PDF. Se il PDF non ha capitoli espliciti, usa i titoli di sezione di primo livello come capitoli. Se non c'è nessuna suddivisione, metti tutto in un unico capitolo dal titolo "Capitolo unico".
7. Correggi eventuali refusi evidenti di OCR. Non aggiungere mai annotazioni fuori dal JSON (niente [[...]], note a margine, commenti).

SCHEMA JSON DI OUTPUT
{
  "version": 1,
  "subjects": [
    {
      "name": "Nome della materia (es. Analisi 1)",
      "color": "blue",
      "chapters": [
        {
          "title": "Titolo del capitolo",
          "items": [
            {
              "type": "definizione",
              "title": "Titolo breve e identificativo dell'elemento",
              "description": "Enunciato/significato, in forma completa",
              "needsProof": true,
              "proofText": "Solo se needsProof è true e il PDF contiene la dimostrazione"
            }
          ]
        }
      ]
    }
  ]
}

REGOLE SUI CAMPI
- "name": deducilo dal titolo del PDF. Se non è deducibile, usa "Materia".
- "color": scegli "blue" se non hai motivo di scegliere "pink".
- "type": deve essere ESATTAMENTE uno tra: "definizione", "teorema", "proprieta", "corollario" (minuscolo, senza accenti). Mappa così:
    * Definizione / Definizioni → "definizione"
    * Teorema / Teoremi / Lemma / Lemmi / Postulato / Assioma / Proposizione → "teorema"
    * Proprietà / Proprieta / Osservazione / Nota → "proprieta"
    * Corollario / Corollari → "corollario"
    * Esempio → NON importarlo, scartalo.
- "title": stringa breve (max ~80 caratteri), senza "Definizione di", "Teorema di" ecc. ripetuti se già impliciti.
- "description": l'enunciato completo (ipotesi + tesi per i teoremi; la definizione completa per le definizioni). Se il PDF contiene più paragrafi, uniscili in un'unica stringa separando con \\n\\n.
- "needsProof": metti true SOLO se il PDF contiene effettivamente la dimostrazione di quell'elemento (tipicamente introdotta da "Dimostrazione", "Dim.", "Proof", "Dimostriamo che..."). Altrimenti false.
- "proofText": compila SOLO quando needsProof è true. Riporta il testo della dimostrazione fedelmente. Non includerlo mai con needsProof false.

COSA SCARTARE
- Indici, sommari, prefazioni, ringraziamenti, bibliografie.
- Esercizi e relative soluzioni.
- Esempi puramente illustrativi (a meno che non siano etichettati come "Teorema" o "Proprietà").
- Figure, tabelle e immagini: se un elemento si riferisce a una figura, scrivi nella description "(vedi figura)" senza tentare di descriverla.

STRUTTURA DA SEGUIRE
- Un solo oggetto in "subjects" se il PDF riguarda una sola materia.
- Ogni capitolo va in "chapters". L'ordine dei capitoli e degli item deve rispettare quello del PDF.
- Se un elemento compare in più capitoli, duplicalo dove compare (non è un errore).

CHECK FINALE PRIMA DI RISPONDERE
- Il testo che stai per produrre è JSON valido? (verifica mentalmente parentesi e virgole)
- Hai rispettato ESATTAMENTE i valori ammessi per "type"?
- Hai incluso "proofText" solo quando needsProof è true?
- Hai escluso indici, esercizi, esempi, assiomi?
- Non hai aggiunto testo fuori dal JSON?
- Hai raddoppiato TUTTI i backslash dei comandi LaTeX?

Ora leggi il PDF che ti allego e produci l'output.`;

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const exportAll = async () => {
    const backup = await exportBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(backup, `penguin-study-backup-${stamp}.json`);
  };

  const importAll = async (file: File) => {
    try {
      const raw = parseJsonLoose(await file.text());
      if (!confirm('Importare il backup? Verranno SOSTITUITI tutti i dati attuali.')) return;
      await importBackup(raw);
      alert('Backup importato correttamente.');
    } catch (e: any) {
      alert('Errore di import: ' + (e?.message ?? e));
    }
  };

  const wipe = async () => {
    if (!confirm('Cancellare TUTTI i dati? Operazione irreversibile.')) return;
    await Promise.all([
      db.subjects.clear(),
      db.chapters.clear(),
      db.items.clear(),
      db.proofImages.clear(),
    ]);
    alert('Dati cancellati.');
  };

  const askNotifications = async () => {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      alert('Permesso notifiche: ' + p);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback per browser senza clipboard API
      const ta = document.createElement('textarea');
      ta.value = LLM_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Impostazioni</h2>

      <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
        <h3 className="font-semibold">Backup completo</h3>
        <p className="text-sm text-ink/60">
          Esporta/importa tutto (materie, capitoli, elementi e foto).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportAll}
            className="px-4 py-2.5 rounded-2xl bg-penguin-blue text-white font-medium hover:bg-penguin-blue-dark"
          >
            Esporta backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl bg-white border border-penguin-blue-soft font-medium hover:bg-penguin-blue-soft"
          >
            Importa backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])}
          />
        </div>
      </section>

      <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
        <h3 className="font-semibold">Notifiche</h3>
        <p className="text-sm text-ink/60">
          Utili per il pomodoro quando il tab è in background. Su iOS serve aggiungere l'app alla
          Home prima di poterle ricevere.
        </p>
        <button
          onClick={askNotifications}
          className="px-4 py-2.5 rounded-2xl bg-white border border-penguin-blue-soft font-medium hover:bg-penguin-blue-soft"
        >
          Richiedi permesso notifiche
        </button>
      </section>

      <section className="p-5 rounded-3xl bg-white/85 border border-penguin-blue-soft space-y-3">
        <div className="flex items-start gap-3">
          <img src="/penguin-pink.svg" alt="" className="w-10 h-10 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Prompt per LLM</h3>
            <p className="text-sm text-ink/60 mt-1">
              Copia questo prompt e incollalo in un LLM (Claude, ChatGPT, Gemini…)
              insieme al PDF dei tuoi appunti. Ti restituirà un file JSON che puoi
              importare dalla pagina di una materia con "Importa JSON".
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyPrompt}
            className={`px-4 py-2.5 rounded-2xl font-medium transition ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-penguin-blue text-white hover:bg-penguin-blue-dark'
            }`}
          >
            {copied ? '✓ Copiato!' : 'Copia prompt'}
          </button>
        </div>

        <pre className="bg-penguin-blue-soft/50 p-3 rounded-xl overflow-x-auto text-xs whitespace-pre-wrap max-h-64 overflow-y-auto border border-penguin-blue-soft">
{LLM_PROMPT}
        </pre>

        <p className="text-xs text-ink/50">
          Il prompt include già le istruzioni per il LaTeX: se l'LLM le rispetta, il
          file si importa senza problemi. Se sbaglia qualcosa, l'app tenta
          automaticamente di ripararlo.
        </p>
      </section>

      <section className="p-5 rounded-3xl bg-white/85 border border-red-200 space-y-3">
        <h3 className="font-semibold text-red-700">Zona pericolosa</h3>
        <p className="text-sm text-ink/60">Cancella tutti i dati memorizzati in questo dispositivo.</p>
        <button
          onClick={wipe}
          className="px-4 py-2.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 font-medium hover:bg-red-100"
        >
          Cancella tutti i dati
        </button>
      </section>
    </div>
  );
}