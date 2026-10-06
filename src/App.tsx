import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './storage/store';
import { Layout } from './ui/Layout';
import Onboarding from './features/onboarding/Onboarding';
import Home from './features/home/Home';
import TimerPage from './features/patching/TimerPage';
import HistoryPage from './features/patching/HistoryPage';
import PlayHub from './features/exercises/PlayHub';
import ExercisePlay from './features/exercises/ExercisePlay';
import Calibration from './features/dichoptic/Calibration';
import DichopticPlay from './features/dichoptic/DichopticPlay';
import GaborPage from './features/gabor/GaborPage';
import StatsPage from './features/stats/StatsPage';
import SettingsPage from './features/settings/SettingsPage';
import BadgesPage from './features/kids/BadgesPage';
import { useReminders } from './platform/reminders';

export default function App() {
  const { loaded, profile } = useStore();
  useReminders();

  useEffect(() => {
    document.documentElement.dataset.mode = profile?.mode ?? 'adult';
  }, [profile?.mode]);

  if (!loaded) return null;

  return (
    <HashRouter>
      {!profile ? (
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/new-profile" element={<Onboarding />} />
          <Route path="/play/exercise/:kind" element={<ExercisePlay />} />
          <Route path="/play/dichoptic/:kind" element={<DichopticPlay />} />
          <Route path="/play/gabor" element={<GaborPage />} />
          <Route path="/calibrate" element={<Calibration />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/play" element={<PlayHub />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
}
