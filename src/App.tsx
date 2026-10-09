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
import MeridionalPage from './features/meridional/MeridionalPage';
import ContrastPage from './features/contrast/ContrastPage';
import PhotosPage from './features/photos/PhotosPage';
import GuidePage from './features/guide/GuidePage';
import VideoPlay from './features/dichoptic/VideoPlay';
import ReadingPage from './features/reading/ReadingPage';
import VisionPage from './features/vision/VisionPage';
import StereoPage from './features/stereo/StereoPage';
import DiaryPage from './features/diary/DiaryPage';
import ReportPage, { SharedReportPage } from './features/report/ReportPage';
import StatsPage from './features/stats/StatsPage';
import SettingsPage from './features/settings/SettingsPage';
import BadgesPage from './features/kids/BadgesPage';
import SetupPage from './features/setup/SetupPage';
import { useReminders } from './platform/reminders';
import { setSoundEnabled } from './platform/sound';
import { useNotificationSync } from './platform/nativeNotifications';
import { useWidgetSync } from './platform/widget';

export default function App() {
  const { loaded, profile } = useStore();
  useReminders();
  useNotificationSync();
  useWidgetSync();

  useEffect(() => {
    document.documentElement.dataset.mode = profile?.mode ?? 'adult';
  }, [profile?.mode]);

  useEffect(() => {
    setSoundEnabled(profile?.soundOn ?? true);
  }, [profile?.soundOn]);

  if (!loaded) return null;

  return (
    <HashRouter>
      {!profile ? (
        <Routes>
          <Route path="/shared/:data" element={<SharedReportPage />} />
          <Route path="*" element={<Onboarding />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/new-profile" element={<Onboarding />} />
          <Route path="/shared/:data" element={<SharedReportPage />} />
          <Route path="/play/exercise/:kind" element={<ExercisePlay />} />
          <Route path="/play/dichoptic/:kind" element={<DichopticPlay />} />
          <Route path="/play/gabor" element={<GaborPage />} />
          <Route path="/play/meridional" element={<MeridionalPage />} />
          <Route path="/play/video" element={<VideoPlay />} />
          <Route path="/play/reading" element={<ReadingPage />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/stereo" element={<StereoPage />} />
          <Route path="/contrast" element={<ContrastPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/calibrate" element={<Calibration />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/play" element={<PlayHub />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/guide" element={<GuidePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
}
