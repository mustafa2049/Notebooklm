import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { CUE_OPTIONS } from '@/habit/cue';
import { formatClock } from '@/habit/goal';
import { REMINDER_SUPPORTED } from '@/habit/reminder';
import { useSettings } from '@/store/SettingsContext';
import { Button, Card, Chip, IconButton, Screen, Toggle, Txt } from '@/ui/primitives';

/**
 * İlk açılış sihirbazı: üç kısa adım.
 *
 * 1. **Ne zaman okuyacaksın?** — davranışı bir duruma bağlamak (uygulama
 *    niyeti) onu alışkanlığa çevirmenin en güçlü yollarından biri.
 * 2. **Günde kaç dakika?** — küçük başla. Beş dakika hiç okumamaktan iyidir ve
 *    hedefi tutturmak, büyük ama tutturulamayan bir hedeften daha motive eder.
 * 3. **Seviye testi** — gelişimin başlangıç noktası (atlanabilir).
 *
 * Her adım atlanabilir; seçimler Ayarlar'dan sonra değiştirilebilir.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [cueIndex, setCueIndex] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(settings.dailyGoalMinutes || 10);
  const [remind, setRemind] = useState(REMINDER_SUPPORTED);

  const finish = (thenTest: boolean) => {
    const cue = cueIndex !== null ? CUE_OPTIONS[cueIndex] : null;
    update({
      onboardingDone: true,
      goalUnit: 'minutes',
      dailyGoalMinutes: minutes,
      ...(cue
        ? {
            readingCue: cue.cue,
            reminderHour: cue.hour,
            reminderMinute: cue.minute,
            reminderEnabled: REMINDER_SUPPORTED && remind,
          }
        : {}),
    });
    if (thenTest) router.replace('/assess');
    else router.back();
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(2),
        }}
      >
        <Txt variant="dim">Adım {step + 1} / 3</Txt>
        <IconButton name="close" onPress={() => finish(false)} accessibilityLabel="Geç" />
      </View>

      {step === 0 ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="title">Ne zaman okuyacaksın?</Txt>
          <Txt variant="dim">
            Okumayı günün belli bir anına bağlamak, onu hatırlamak zorunda kalmadan yapılan
            bir alışkanlığa çevirir. Sana en uygun anı seç.
          </Txt>
          <View style={{ gap: theme.space(2) }}>
            {CUE_OPTIONS.map((option, index) => (
              <Card
                key={option.cue}
                onPress={() => setCueIndex(index)}
                style={{
                  borderColor: cueIndex === index ? theme.colors.accent : theme.colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Txt variant="body">{option.label}</Txt>
                <Txt variant="dim" style={{ fontSize: 13 }}>
                  {formatClock(option.hour, option.minute)}
                </Txt>
              </Card>
            ))}
          </View>
          {REMINDER_SUPPORTED && cueIndex !== null ? (
            <Toggle
              label="O saatte hatırlat"
              hint="Telefonuna günlük bir bildirim gelir; Ayarlar'dan kapatabilirsin."
              value={remind}
              onChange={setRemind}
            />
          ) : null}
          <Button label="Devam" disabled={cueIndex === null} onPress={() => setStep(1)} />
          <Button label="Şimdilik geç" variant="ghost" onPress={() => setStep(1)} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="title">Günde kaç dakika?</Txt>
          <Txt variant="dim">
            Küçük başla. Her gün tutturulan beş dakika, haftada bir yapılan bir saatten daha
            hızlı alışkanlık olur. Hedefi sonra büyütebilirsin.
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            {[5, 10, 15, 20].map((value) => (
              <Chip
                key={value}
                label={`${value} dakika`}
                active={minutes === value}
                onPress={() => setMinutes(value)}
              />
            ))}
          </View>
          {cueIndex !== null ? (
            <Card>
              <Txt variant="body">
                Planın: {CUE_OPTIONS[cueIndex].cue} {minutes} dakika okumak.
              </Txt>
            </Card>
          ) : null}
          <Button label="Devam" onPress={() => setStep(2)} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="title">Nereden başlıyorsun?</Txt>
          <Txt variant="dim">
            İki dakikalık bir metni kendi hızında oku, beş soruyu cevapla. Doğal hızını ve
            anlama oranını ölçelim; her hafta tekrarlayınca gerçekten hızlanıp hızlanmadığını
            göreceksin.
          </Txt>
          <Card style={{ gap: theme.space(1) }}>
            <Txt variant="body">Dürüst bir not</Txt>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              Araştırmalar, anlamayı kaybetmeden okuma hızını kat kat artırmanın mümkün
              olmadığını gösteriyor. Gerçekçi kazanç; düzenli okumaktan, geri dönüşleri
              azaltmaktan, kelime bilgisinden ve göz gezdirme becerisinden geliyor. Bu yüzden
              burada hız değil, efektif hız (hız × anlama) ölçülüyor.
            </Txt>
          </Card>
          <Button label="Seviye testini yap" icon="check" onPress={() => finish(true)} />
          <Button label="Sonra" variant="secondary" onPress={() => finish(false)} />
        </View>
      ) : null}
    </Screen>
  );
}
