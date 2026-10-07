import type { Profile, VisionTest } from '../../model/types';

export type SetupStepId = 'eye' | 'rx' | 'plan' | 'screen' | 'glasses' | 'vision';

export interface SetupStep {
  id: SetupStepId;
  icon: string;
  title: string;
  desc: string;
  done: boolean;
}

/** Kurulum sihirbazının adımları ve tamamlanma durumları. */
export function setupSteps(profile: Profile, visionTests: VisionTest[]): SetupStep[] {
  return [
    {
      id: 'eye',
      icon: '👁️',
      title: 'Tembel göz',
      desc: 'Hangi gözün tembel olduğunu ve bandın hangi göze takılacağını doğrula.',
      done: true, // ilk açılışta seçiliyor
    },
    {
      id: 'rx',
      icon: '👓',
      title: 'Gözlük reçetesi',
      desc: 'Doktorun yazdığı gözlük değerlerini kaydet.',
      done: !!profile.prescription || !!profile.rxSkipped,
    },
    {
      id: 'plan',
      icon: '🩺',
      title: 'Doktorun planı',
      desc: 'Günlük kapama süresi, kontrol tarihi ve doktor notu.',
      done: !!profile.planConfirmed,
    },
    {
      id: 'screen',
      icon: '📏',
      title: 'Ekran ölçüsü',
      desc: 'Görme testinin doğru olması için ekranı bir kartla ölç.',
      done: !!profile.screenPxPerMm,
    },
    {
      id: 'glasses',
      icon: '🟥',
      title: 'Kırmızı-mavi gözlük ayarı',
      desc: 'İki gözlü oyunlar için anaglif gözlüğü ayarla.',
      done: profile.anaglyph.calibrated,
    },
    {
      id: 'vision',
      icon: '🔤',
      title: 'İlk görme testi',
      desc: 'Başlangıç değerini ölç; ilerlemeyi buna göre izleriz.',
      done: visionTests.some((t) => t.profileId === profile.id),
    },
  ];
}

export const setupProgress = (steps: SetupStep[]) => ({ done: steps.filter((s) => s.done).length, total: steps.length });

/** Ana sayfada kurulum kartı gösterilsin mi. */
export const showSetupCard = (profile: Profile, steps: SetupStep[]): boolean =>
  !profile.setupDismissed && steps.some((s) => !s.done);
