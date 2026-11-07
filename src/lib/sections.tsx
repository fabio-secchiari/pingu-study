import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, type Location } from 'react-router-dom';

/**
 * La sezione "Materie" (elenco, materia, ripasso, stampa) resta montata anche quando si va
 * su Igloo, Pomodoro o Impostazioni: viene solo nascosta. Così al ritorno ritrovi tutto
 * com'era — la materia aperta, i filtri, la scheda che stavi scrivendo, il ripasso a metà —
 * e anche il punto della pagina in cui eri.
 */

export const isMateriePath = (p: string) => p === '/' || /^\/(subject|ripasso|stampa)\//.test(p);

interface SectionState {
  /** true se la sezione Materie è quella visibile ora */
  materieActive: boolean;
  /** Dove riportare il pulsante "Materie" */
  lastMateriePath: string;
}

const Ctx = createContext<SectionState>({ materieActive: true, lastMateriePath: '/' });

export const useSections = () => useContext(Ctx);

/** true se il componente sta nella sezione visibile (per disattivare scorciatoie quando è nascosto). */
export const useMaterieActive = () => useContext(Ctx).materieActive;

const START: Location = { pathname: '/', search: '', hash: '', state: null, key: 'start' };

export function useMaterieLocation(): { materieLocation: Location; materieActive: boolean } {
  const location = useLocation();
  const active = isMateriePath(location.pathname);
  const [last, setLast] = useState<Location>(active ? location : START);
  useEffect(() => {
    if (active) setLast(location);
  }, [active, location]);
  return { materieLocation: active ? location : last, materieActive: active };
}

export function SectionsProvider({
  materieActive,
  materieLocation,
  children,
}: {
  materieActive: boolean;
  materieLocation: Location;
  children: ReactNode;
}) {
  const lastMateriePath = materieLocation.pathname + materieLocation.search;

  // Ricorda lo scroll della sezione Materie quando la lasci e ripristinalo al ritorno;
  // le altre schede partono dall'alto.
  const savedScroll = useRef(0);
  const wasActive = useRef(materieActive);
  // Aggiornato già durante il render: quando la sezione si nasconde la pagina si accorcia e il
  // browser genera uno scroll "finto" che non deve sovrascrivere la posizione salvata.
  const listening = useRef(materieActive);
  listening.current = materieActive;
  useLayoutEffect(() => {
    if (wasActive.current && !materieActive) {
      window.scrollTo(0, 0);
    } else if (!wasActive.current && materieActive) {
      const y = savedScroll.current;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    wasActive.current = materieActive;
  }, [materieActive]);
  useEffect(() => {
    if (!materieActive) return;
    const onScroll = () => {
      if (listening.current) savedScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [materieActive]);

  return <Ctx.Provider value={{ materieActive, lastMateriePath }}>{children}</Ctx.Provider>;
}
