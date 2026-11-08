/**
 * Dexie Cloud chiude il websocket (e smette di ricevere i cambiamenti in tempo reale)
 * se per 3 minuti non arrivano eventi di mouse/tastiera, anche con la pagina in primo piano.
 * Finché la scheda è visibile, ogni minuto simuliamo un piccolo "mousemove" su window così
 * la sincronizzazione resta attiva e i messaggi arrivano subito.
 *
 * - Con la scheda nascosta (altra scheda, schermo spento) non facciamo nulla: Dexie si
 *   disconnette come al solito e risincronizza appena torni.
 * - Dopo 6 ore senza nessuna attività vera ci fermiamo, per non tenere connessa all'infinito
 *   una scheda dimenticata aperta.
 */
const PING_EVERY = 60_000;
const MAX_IDLE = 6 * 60 * 60_000;

export function keepSyncAlive() {
  if (typeof window === 'undefined') return;
  let lastRealActivity = Date.now();
  const markReal = (e: Event) => {
    if (e.isTrusted) lastRealActivity = Date.now();
  };
  for (const type of ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchmove', 'touchstart']) {
    window.addEventListener(type, markReal, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') lastRealActivity = Date.now();
  });

  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastRealActivity > MAX_IDLE) return;
    window.dispatchEvent(new Event('mousemove'));
  }, PING_EVERY);
}
