import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SubjectsPage from './pages/SubjectsPage';
import SubjectPage from './pages/SubjectPage';
import PomodoroPage from './pages/PomodoroPage';
import SettingsPage from './pages/SettingsPage';
import ReviewPage from './pages/ReviewPage';
import PrintPage from './pages/PrintPage';
import IglooPage from './pages/IglooPage';
import GuidePage from './pages/GuidePage';
import { PomodoroProvider } from './lib/pomodoro';
import { SectionsProvider, useMaterieLocation } from './lib/sections';
import { useEffect } from 'react';
import { useIgloo } from './lib/cloud';
import { setUserMacros } from './lib/katexMacros';
import { setUserSnippets } from './components/editor/latexSuite';

/** Tiene allineati i comandi e le scorciatoie personali (salvati nell'igloo) con KaTeX e l'editor. */
function CustomLatexSync() {
  const igloo = useIgloo();
  const cmds = JSON.stringify(igloo.customCommands ?? []);
  const snips = JSON.stringify(igloo.customSnippets ?? []);
  useEffect(() => setUserMacros(JSON.parse(cmds)), [cmds]);
  useEffect(() => setUserSnippets(JSON.parse(snips)), [snips]);
  return null;
}

function AppRoutes() {
  const { materieLocation, materieActive } = useMaterieLocation();
  return (
    <SectionsProvider materieActive={materieActive} materieLocation={materieLocation}>
      <Layout>
        {/* Sezione Materie: sempre montata, nascosta quando sei su un'altra scheda */}
        <div hidden={!materieActive}>
          <Routes location={materieLocation}>
            <Route path="/" element={<SubjectsPage />} />
            <Route path="/subject/:id" element={<SubjectPage />} />
            <Route path="/ripasso/:id" element={<ReviewPage />} />
            <Route path="/stampa/:id" element={<PrintPage />} />
            <Route path="*" element={null} />
          </Routes>
        </div>
        {!materieActive && (
          <Routes>
            <Route path="/igloo" element={<IglooPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/impostazioni" element={<SettingsPage />} />
            <Route path="/guida" element={<GuidePage />} />
            <Route path="*" element={null} />
          </Routes>
        )}
      </Layout>
    </SectionsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PomodoroProvider>
        <CustomLatexSync />
        <AppRoutes />
      </PomodoroProvider>
    </BrowserRouter>
  );
}
