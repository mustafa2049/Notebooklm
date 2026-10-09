import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  emptyData,
  uid,
  type ActivityResult,
  type AppData,
  type DiaryEntry,
  type OrientationTest,
  type StereoTest,
  type VisionTest,
  type GaborResult,
  type Profile,
} from '../model/types';
import { loadData, requestPersistence, saveData } from './db';

interface Store {
  data: AppData;
  loaded: boolean;
  profile: Profile | null;
  addProfile(p: Omit<Profile, 'id' | 'createdAt'>): Profile;
  updateProfile(id: string, patch: Partial<Profile>): void;
  deleteProfile(id: string): void;
  setActiveProfile(id: string): void;
  /** Aktif profilin zamanlayıcısının başlangıç zamanı. */
  runningSince: number | null;
  startTimer(): void;
  stopTimer(): void;
  /** Zamanlayıcıyı oturum kaydetmeden durdurur. */
  cancelTimer(): void;
  addManualSession(start: number, end: number): void;
  deleteSession(id: string): void;
  addResult(r: Omit<ActivityResult, 'id' | 'profileId' | 'at'>): ActivityResult | null;
  addGabor(r: Omit<GaborResult, 'id' | 'profileId' | 'at'>): void;
  addVisionTest(r: Omit<VisionTest, 'id' | 'profileId' | 'at'>): void;
  addStereoTest(r: Omit<StereoTest, 'id' | 'profileId' | 'at'>): void;
  addOrientationTest(r: Omit<OrientationTest, 'id' | 'profileId' | 'at'>): void;
  /** Günün kaydını ekler ya da günceller (gün başına tek kayıt). */
  saveDiary(e: Omit<DiaryEntry, 'id' | 'profileId'>): void;
  replaceAll(d: AppData): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number>();

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoaded(true);
    });
    requestPersistence();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveData(data).catch(console.error), 150);
  }, [data, loaded]);

  // Sayfa kapanırken bekleyen kaydı hemen yaz.
  useEffect(() => {
    const flush = () => {
      if (loaded) saveData(data).catch(console.error);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [data, loaded]);

  const profile = data.profiles.find((p) => p.id === data.activeProfileId) ?? null;
  const pid = profile?.id ?? null;
  const runningSince = pid ? (data.timers[pid] ?? null) : null;

  const addProfile = useCallback((p: Omit<Profile, 'id' | 'createdAt'>) => {
    const created: Profile = { ...p, id: uid(), createdAt: Date.now() };
    setData((d) => ({ ...d, profiles: [...d.profiles, created], activeProfileId: created.id }));
    return created;
  }, []);

  const updateProfile = useCallback((id: string, patch: Partial<Profile>) => {
    setData((d) => ({ ...d, profiles: d.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setData((d) => {
      const profiles = d.profiles.filter((p) => p.id !== id);
      const timers = { ...d.timers };
      delete timers[id];
      return {
        ...d,
        profiles,
        activeProfileId: d.activeProfileId === id ? (profiles[0]?.id ?? null) : d.activeProfileId,
        sessions: d.sessions.filter((s) => s.profileId !== id),
        results: d.results.filter((r) => r.profileId !== id),
        gabor: d.gabor.filter((g) => g.profileId !== id),
        visionTests: d.visionTests.filter((v) => v.profileId !== id),
        stereoTests: d.stereoTests.filter((v) => v.profileId !== id),
        orientationTests: d.orientationTests.filter((v) => v.profileId !== id),
        diary: d.diary.filter((e) => e.profileId !== id),
        timers,
      };
    });
  }, []);

  const setActiveProfile = useCallback((id: string) => {
    setData((d) => ({ ...d, activeProfileId: id }));
  }, []);

  const startTimer = useCallback(() => {
    if (!pid) return;
    setData((d) => (d.timers[pid] ? d : { ...d, timers: { ...d.timers, [pid]: Date.now() } }));
  }, [pid]);

  const stopTimer = useCallback(() => {
    if (!pid) return;
    setData((d) => {
      const start = d.timers[pid];
      if (!start) return d;
      const end = Date.now();
      const sessions = end - start >= 1000 ? [...d.sessions, { id: uid(), profileId: pid, start, end }] : d.sessions;
      return { ...d, sessions, timers: { ...d.timers, [pid]: null } };
    });
  }, [pid]);

  const cancelTimer = useCallback(() => {
    if (!pid) return;
    setData((d) => ({ ...d, timers: { ...d.timers, [pid]: null } }));
  }, [pid]);

  const addManualSession = useCallback(
    (start: number, end: number) => {
      if (!pid || end <= start) return;
      setData((d) => ({ ...d, sessions: [...d.sessions, { id: uid(), profileId: pid, start, end }] }));
    },
    [pid],
  );

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
  }, []);

  const addResult = useCallback(
    (r: Omit<ActivityResult, 'id' | 'profileId' | 'at'>) => {
      if (!pid) return null;
      const res: ActivityResult = { ...r, id: uid(), profileId: pid, at: Date.now() };
      setData((d) => ({ ...d, results: [...d.results, res] }));
      return res;
    },
    [pid],
  );

  const addGabor = useCallback(
    (r: Omit<GaborResult, 'id' | 'profileId' | 'at'>) => {
      if (!pid) return;
      setData((d) => ({ ...d, gabor: [...d.gabor, { ...r, id: uid(), profileId: pid, at: Date.now() }] }));
    },
    [pid],
  );

  const addVisionTest = useCallback(
    (r: Omit<VisionTest, 'id' | 'profileId' | 'at'>) => {
      if (!pid) return;
      setData((d) => ({ ...d, visionTests: [...d.visionTests, { ...r, id: uid(), profileId: pid, at: Date.now() }] }));
    },
    [pid],
  );

  const addStereoTest = useCallback(
    (r: Omit<StereoTest, 'id' | 'profileId' | 'at'>) => {
      if (!pid) return;
      setData((d) => ({ ...d, stereoTests: [...d.stereoTests, { ...r, id: uid(), profileId: pid, at: Date.now() }] }));
    },
    [pid],
  );

  const addOrientationTest = useCallback(
    (r: Omit<OrientationTest, 'id' | 'profileId' | 'at'>) => {
      if (!pid) return;
      setData((d) => ({ ...d, orientationTests: [...d.orientationTests, { ...r, id: uid(), profileId: pid, at: Date.now() }] }));
    },
    [pid],
  );

  const saveDiary = useCallback(
    (e: Omit<DiaryEntry, 'id' | 'profileId'>) => {
      if (!pid) return;
      setData((d) => {
        const existing = d.diary.find((x) => x.profileId === pid && x.day === e.day);
        const entry: DiaryEntry = { ...e, id: existing?.id ?? uid(), profileId: pid };
        return { ...d, diary: [...d.diary.filter((x) => x !== existing), entry] };
      });
    },
    [pid],
  );

  const replaceAll = useCallback((d: AppData) => setData(d), []);

  const value = useMemo<Store>(
    () => ({
      data,
      loaded,
      profile,
      addProfile,
      updateProfile,
      deleteProfile,
      setActiveProfile,
      runningSince,
      startTimer,
      stopTimer,
      cancelTimer,
      addManualSession,
      deleteSession,
      addResult,
      addGabor,
      addVisionTest,
      addStereoTest,
      addOrientationTest,
      saveDiary,
      replaceAll,
    }),
    [data, loaded, profile, runningSince, addProfile, updateProfile, deleteProfile, setActiveProfile, startTimer, stopTimer, cancelTimer, addManualSession, deleteSession, addResult, addGabor, addVisionTest, addStereoTest, addOrientationTest, saveDiary, replaceAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider eksik');
  return s;
}

/** Aktif profil olduğu varsayılan ekranlar için. */
export function useProfile(): Profile {
  const { profile } = useStore();
  if (!profile) throw new Error('Profil yok');
  return profile;
}

/** Her `ms` milisaniyede yeniden çizim için şimdiki zaman. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
