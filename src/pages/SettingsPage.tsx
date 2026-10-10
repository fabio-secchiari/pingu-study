import { useRef } from 'react';
import { db } from '../db';
import { downloadJson, exportBackup, importBackup, importFromLLM } from '../lib/backup';
import { BackupSchema, LLMImportSchema, parseJsonLoose } from '../lib/schema';

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportAll = async () => {
    const backup = await exportBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(backup, `penguin-study-backup-${stamp}.json`);
  };

  const importAll = async (file: File) => {
    try {
        const raw = parseJsonLoose(await file.text());
        // File in formato LLM (senza id/timestamp): si aggiunge ai dati esistenti.
        if (!BackupSchema.safeParse(raw).success && LLMImportSchema.safeParse(raw).success) {
          if (!confirm('Il file è in formato LLM: le materie verranno AGGIUNTE a quelle esistenti. Procedere?')) return;
          await importFromLLM(raw);
          alert('Import completato.');
          return;
        }
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

      <section className="p-5 rounded-3xl bg-white/60 border border-penguin-blue-soft text-sm text-ink/60 space-y-2">
        <h3 className="font-semibold text-ink/80">Formato JSON per LLM (import per materia)</h3>
        <pre className="bg-penguin-blue-soft/50 p-3 rounded-xl overflow-x-auto text-xs">{`{
  "version": 1,
  "subjects": [
    {
      "name": "Analisi 1",
      "color": "blue",
      "chapters": [
        {
          "title": "Capitolo 1 — Numeri reali",
          "items": [
            {
              "type": "definizione",
              "title": "Estremo superiore",
              "description": "Il più piccolo maggiorante…",
              "needsProof": false
            },
            {
              "type": "teorema",
              "title": "Teorema di Weierstrass",
              "description": "Una funzione continua su un compatto…",
              "needsProof": true,
              "proofText": "Testo della dimostrazione…"
            }
          ]
        }
      ]
    }
  ]
}`}</pre>
        <p>
          Valori ammessi per <code>type</code>: <code>definizione</code>, <code>teorema</code>,{' '}
          <code>proprieta</code>, <code>corollario</code> (accetta anche con accento).
        </p>
      </section>
    </div>
  );
}