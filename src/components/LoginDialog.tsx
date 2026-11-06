import { useEffect, useState } from 'react';
import { useObservable } from 'dexie-react-hooks';
import { db } from '../db';
import Penguin from './Penguin';

const TITLES: Record<string, string> = {
  email: 'Entra nel tuo igloo',
  otp: 'Controlla la posta 📬',
  'message-alert': 'Avviso',
  'logout-confirmation': 'Uscire?',
};

function translateAlert(a: { messageCode: string; message: string; messageParams: Record<string, string> }) {
  switch (a.messageCode) {
    case 'OTP_SENT':
      return `Ti ho mandato un codice a ${a.messageParams.email ?? 'la tua email'}.`;
    case 'INVALID_OTP':
      return 'Codice non valido o scaduto. Riprova.';
    case 'INVALID_EMAIL':
      return 'Email non valida.';
    case 'LICENSE_LIMIT_REACHED':
    case 'NO_SEATS_AVAILABLE':
      return 'Limite di utenti raggiunto sul database cloud.';
    case 'USER_NOT_REGISTERED':
    case 'USER_NOT_ACCEPTED':
      return 'Questo indirizzo non è autorizzato ad accedere.';
    case 'LOGOUT_CONFIRMATION':
      return 'Ci sono modifiche non ancora sincronizzate: uscendo andrebbero perse su questo dispositivo.';
    default:
      return a.message;
  }
}

/** Interfaccia di login (codice via email) a tema pinguino per Dexie Cloud. */
export default function LoginDialog() {
  const ui = useObservable(db.cloud.userInteraction);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => setValues({}), [ui?.type]);

  if (!ui) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ui.onSubmit(values as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Penguin color="blue" accessory="sciarpa" className="w-14 h-14" />
          <h2 className="text-xl font-bold">{TITLES[ui.type] ?? ui.title}</h2>
        </div>

        {ui.alerts?.map((a, i) => (
          <p
            key={i}
            className={`text-sm px-3 py-2 rounded-xl ${
              a.type === 'error'
                ? 'bg-red-50 text-red-700'
                : a.type === 'warning'
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-penguin-blue-soft text-ink/80'
            }`}
          >
            {translateAlert(a as any)}
          </p>
        ))}

        {ui.type === 'email' && (
          <p className="text-sm text-ink/60">
            Niente password: scrivi la tua email e ti arriva un codice. I tuoi dati restano anche offline.
          </p>
        )}

        {Object.entries(ui.fields ?? {}).map(([name, field]: [string, any]) => (
          <input
            key={name}
            autoFocus
            type={name === 'email' ? 'email' : 'text'}
            inputMode={name === 'otp' ? 'numeric' : undefined}
            autoComplete={name === 'otp' ? 'one-time-code' : name === 'email' ? 'email' : undefined}
            placeholder={name === 'email' ? 'nome@email.it' : name === 'otp' ? 'Codice' : field.placeholder ?? field.label}
            aria-label={field.label ?? name}
            value={values[name] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
            className="w-full px-4 py-3 rounded-2xl bg-penguin-blue-soft/50 border border-penguin-blue-soft focus:outline-none focus:ring-2 focus:ring-penguin-blue text-center tracking-wide"
          />
        ))}

        <div className="flex gap-2 justify-end">
          {ui.cancelLabel && (
            <button type="button" onClick={ui.onCancel} className="px-4 py-2.5 rounded-2xl text-ink/70 hover:bg-ink/5">
              Annulla
            </button>
          )}
          <button type="submit" className="px-5 py-2.5 rounded-2xl bg-penguin-blue text-white font-medium hover:bg-penguin-blue-dark">
            {ui.type === 'email' ? 'Mandami il codice' : ui.type === 'otp' ? 'Entra' : ui.type === 'logout-confirmation' ? 'Esci comunque' : 'OK'}
          </button>
        </div>
      </form>
    </div>
  );
}
