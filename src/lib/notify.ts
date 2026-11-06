/**
 * Notifiche di sistema.
 *
 * Su Android e nelle PWA installate `new Notification()` non è permesso: bisogna passare
 * dal service worker (`registration.showNotification`). Su iPhone/iPad le notifiche
 * funzionano solo se l'app è stata aggiunta alla schermata Home (iOS 16.4+).
 */

export type NotifyState = 'attive' | 'da-chiedere' | 'bloccate' | 'serve-home' | 'non-supportate';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS si presenta come Mac

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export function notifyState(): NotifyState {
  if (!('Notification' in window)) return isIOS() && !isStandalone() ? 'serve-home' : 'non-supportate';
  if (Notification.permission === 'granted') return 'attive';
  if (Notification.permission === 'denied') return 'bloccate';
  return 'da-chiedere';
}

export async function requestNotifications(): Promise<NotifyState> {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }
  return notifyState();
}

export async function notify(title: string, body: string, tag?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = { body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    /* provo col costruttore */
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
