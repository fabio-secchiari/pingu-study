import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SubjectsPage from './pages/SubjectsPage';
import SubjectPage from './pages/SubjectPage';
import PomodoroPage from './pages/PomodoroPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SubjectsPage />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}