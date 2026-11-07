import { NavLink, Link } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useObservable } from 'dexie-react-hooks';
import { db } from '../db';
import GlobalSearch from './GlobalSearch';
import LoginDialog from './LoginDialog';
import NotePopup from './NotePopup';
import Celebration from './Celebration';
import Penguin from './Penguin';
import { cosmeticsOf } from '../types';
import PomodoroBar from './PomodoroBar';
import {
  ensureProfile,
  reconcileWithIgloo,
  useCurrentUser,
  useIgloo,
  useMisplacedCount,
  useProfiles,
  useSharedRealmId,
} from '../lib/cloud';
import { specialDays } from '../lib/special';
import { useSections } from '../lib/sections';

const navItems = [
  { to: '/', label: 'Materie', icon: '📚' },
  { to: '/igloo', label: 'Igloo', icon: '🏠' },
  { to: '/pomodoro', label: 'Pomodoro', icon: '🍅' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
];

function SyncDot() {
  const sync = useObservable(db.cloud.syncState);
  const user = useCurrentUser();
  if (!user?.isLoggedIn) return null;
  const color =
    sync?.phase === 'error'
      ? 'bg-red-400'
      : sync?.status === 'connected' && sync.phase === 'in-sync'
        ? 'bg-emerald-400'
        : sync?.phase === 'offline' || sync?.status === 'offline'
          ? 'bg-ink/30'
          : 'bg-amber-400';
  const label =
    sync?.phase === 'error' ? 'Errore di sincronizzazione' : sync?.phase === 'in-sync' ? 'Sincronizzato' : sync?.phase === 'offline' ? 'Offline' : 'Sincronizzo…';
  return <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${color}`} title={label} />;
}

export default function Layout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const user = useCurrentUser();
  const { me, mine } = useProfiles();
  const shared = useSharedRealmId();
  const misplaced = useMisplacedCount(shared, me);
  const igloo = useIgloo();
  const special = specialDays(igloo);
  // "Materie" (e il logo) riportano esattamente dove eri: materia aperta, ripasso a metà…
  // Se sei già nella sezione, il pulsante torna all'elenco delle materie.
  const { materieActive, lastMateriePath } = useSections();
  const materieHref = materieActive ? '/' : lastMateriePath;

  useEffect(() => {
    if (user?.isLoggedIn && user.userId) ensureProfile(user.userId, user.email);
  }, [user?.isLoggedIn, user?.userId, user?.email]);

  // Profilo, pomodori e bigliettini devono stare nell'igloo condiviso, altrimenti l'altra
  // persona non li vede. Li sposto in automatico appena ce n'è qualcuno fuori posto.
  useEffect(() => {
    if (shared && misplaced > 0) reconcileWithIgloo(shared, me).catch((e) => console.error('Riallineamento igloo', e));
  }, [shared, me, misplaced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-penguin-blue-soft">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link to={materieHref} className="flex items-center gap-2 shrink-0">
            <Penguin color="blue" accessory={special.length ? 'fiocco' : 'none'} className="w-9 h-10 drop-shadow" />
            <h1 className="hidden md:block text-lg font-bold tracking-tight text-ink">Penguin Study</h1>
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to === '/' ? materieHref : n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                    (n.to === '/' ? materieActive : isActive)
                      ? 'bg-penguin-blue text-white shadow-sm'
                      : 'text-ink/70 hover:bg-penguin-blue-soft'
                  }`
                }
              >
                <span className="sm:hidden" aria-hidden>
                  {n.icon}
                </span>
                <span className="hidden sm:inline">{n.label}</span>
                <span className="sr-only sm:hidden">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="h-10 px-3 rounded-xl text-ink/70 hover:bg-penguin-blue-soft text-sm flex items-center gap-2"
              aria-label="Cerca in tutte le materie"
              title="Cerca (⌘K)"
            >
              🔍<span className="hidden lg:inline text-xs text-ink/40">⌘K</span>
            </button>
            {user?.isLoggedIn ? (
              <Link to="/igloo" className="relative w-10 h-10 rounded-full bg-penguin-blue-soft flex items-center justify-center" title={user.email}>
                <Penguin color={mine?.color ?? 'blue'} cosmetics={cosmeticsOf(mine)} className="w-7 h-8" />
                <SyncDot />
              </Link>
            ) : (
              <button
                onClick={() => db.cloud.login()}
                className="h-10 px-3 rounded-xl bg-penguin-pink text-white text-sm font-medium hover:bg-penguin-pink-dark whitespace-nowrap"
              >
                Accedi
              </button>
            )}
          </div>
        </div>
        <PomodoroBar />
        {special.length > 0 && (
          <Link to="/igloo" className="block text-center text-xs py-1 bg-penguin-pink-soft text-penguin-pink-dark font-medium">
            {special.map((s) => s.title).join(' · ')}
          </Link>
        )}
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="text-center text-xs text-ink/40 py-4 space-x-2">
        <span>🐧 fatto con amore per studiare meglio, insieme</span>
        <span aria-hidden>·</span>
        <Link to="/guida" className="underline hover:text-ink/70">📖 Guida</Link>
      </footer>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <LoginDialog />
      <NotePopup />
      <Celebration />
    </div>
  );
}
