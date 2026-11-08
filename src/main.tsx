import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { migrateFromLocalDb } from './lib/migrate';
import { keepSyncAlive } from './lib/keepSyncAlive';

registerSW({ immediate: true });
keepSyncAlive();

// Chiede al browser di non cancellare i dati locali (Safari li elimina dopo 7 giorni di inattività
// se la PWA non è installata nella schermata Home).
navigator.storage?.persist?.().catch(() => {});

const root = createRoot(document.getElementById('root')!);

// Prima copia i dati dal vecchio database locale, poi mostra l'app.
migrateFromLocalDb()
  .catch((e) => console.error('Migrazione dal database locale non riuscita', e))
  .finally(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  );
