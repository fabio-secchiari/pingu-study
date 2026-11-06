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

export default function App() {
  return (
    <BrowserRouter>
      <PomodoroProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<SubjectsPage />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="/ripasso/:id" element={<ReviewPage />} />
          <Route path="/stampa/:id" element={<PrintPage />} />
          <Route path="/igloo" element={<IglooPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/guida" element={<GuidePage />} />
        </Routes>
      </Layout>
      </PomodoroProvider>
    </BrowserRouter>
  );
}
