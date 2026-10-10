import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/', label: 'Materie' },
  { to: '/pomodoro', label: 'Pomodoro' },
  { to: '/impostazioni', label: 'Impostazioni' },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-penguin-blue-soft">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <img src="/penguin-blue.svg" alt="" className="w-10 h-10 drop-shadow" />
          <h1 className="text-lg font-bold tracking-tight text-ink">Penguin Study</h1>
          <nav className="ml-auto flex gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-penguin-blue text-white shadow-sm'
                      : 'text-ink/70 hover:bg-penguin-blue-soft'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="text-center text-xs text-ink/40 py-4">🐧 fatto per studiare meglio</footer>
    </div>
  );
}