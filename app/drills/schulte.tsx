import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listDrillResults, recordDrill, type DrillResult } from '@/storage/drills';
import { createSchulte, tapSchulte, type SchulteState } from '@/train/drills/schulte';
import { haptics } from '@/ui/haptics';
import { DrillHeader } from '@/ui/DrillHeader';
import { Button, Card, Chip, Screen, Txt } from '@/ui/primitives';

/**
 * Schulte tablosu ekranı. Süre ilk dokunuşta başlar (yönergeyi okumak süreye
 * girmesin). Gözü merkezdeki karede tutup sayıları çevresel görüşle aramak
 * egzersizin asıl kısmı; arayüz bunu yönergede söylüyor.
 */
export default function SchulteScreen() {
  const { theme, settings } = useSettings();
  const [size, setSize] = useState(5);
  const [state, setState] = useState<SchulteState>(() => createSchulte(5, Math.random));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [best, setBest] = useState<Record<number, number>>({});
  const saved = useRef(false);

  useEffect(() => {
    listDrillResults().then((results) => setBest(bestTimes(results)));
  }, []);

  useEffect(() => {
    if (startedAt === null || state.done) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, [startedAt, state.done]);

  useEffect(() => {
    if (!state.done || saved.current || startedAt === null) return;
    saved.current = true;
    const ms = Date.now() - startedAt;
    setElapsed(ms);
    haptics.success(settings.haptics);
    void recordDrill({ drill: 'schulte', at: Date.now(), ms, size: state.size, errors: state.errors });
    setBest((current) => ({
      ...current,
      [state.size]: Math.min(current[state.size] ?? Infinity, ms),
    }));
  }, [state.done, state.size, state.errors, startedAt, settings.haptics]);

  const restart = (nextSize = size) => {
    saved.current = false;
    setSize(nextSize);
    setState(createSchulte(nextSize, Math.random));
    setStartedAt(null);
    setElapsed(0);
  };

  const tap = (value: number) => {
    if (startedAt === null) setStartedAt(Date.now());
    const next = tapSchulte(state, value);
    if (next.errors > state.errors) {
      setFlash(value);
      setTimeout(() => setFlash(null), 250);
      haptics.step(settings.haptics);
    }
    setState(next);
  };

  const center = Math.floor((size * size) / 2);

  return (
    <Screen>
      <DrillHeader title="Schulte tablosu" />
      <Txt variant="dim" style={{ marginBottom: theme.space(3) }}>
        Gözünü ortadaki karede tut, başını ve gözünü gezdirmeden 1’den başlayarak sırayla
        dokun. Süre ilk dokunuşta başlar.
      </Txt>

      <View style={{ flexDirection: 'row', gap: theme.space(2), marginBottom: theme.space(3) }}>
        {[3, 4, 5].map((option) => (
          <Chip
            key={option}
            label={`${option}×${option}`}
            active={size === option}
            onPress={() => restart(option)}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.space(2) }}>
        <Txt variant="mono" style={{ color: theme.colors.accent }}>
          {(elapsed / 1000).toFixed(1)} sn
        </Txt>
        <Txt variant="dim">
          Sıradaki: {state.done ? '—' : state.next} · hata {state.errors}
        </Txt>
      </View>

      <View style={{ aspectRatio: 1, gap: 4 }}>
        {Array.from({ length: size }, (_, row) => (
          <View key={row} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {state.cells.slice(row * size, row * size + size).map((value, column) => {
              const index = row * size + column;
              const passed = value < state.next;
              return (
                <Pressable
                  key={value}
                  onPress={() => tap(value)}
                  disabled={state.done}
                  accessibilityLabel={`${value}`}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radius.sm,
                    backgroundColor:
                      flash === value
                        ? theme.colors.danger
                        : passed
                          ? theme.colors.surface
                          : theme.colors.surfaceAlt,
                    borderWidth: index === center ? 2 : 0,
                    borderColor: theme.colors.accent,
                  }}
                >
                  <Txt
                    variant="heading"
                    style={{
                      fontSize: size === 5 ? 22 : 28,
                      color: passed ? theme.colors.textFaint : theme.colors.text,
                    }}
                  >
                    {value}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {state.done ? (
        <Card style={{ marginTop: theme.space(4), gap: theme.space(2) }}>
          <Txt variant="heading">
            {(elapsed / 1000).toFixed(1)} saniye · {state.errors} hata
          </Txt>
          <Txt variant="dim">
            {best[size] !== undefined && best[size] < elapsed
              ? `En iyi süren ${(best[size] / 1000).toFixed(1)} sn.`
              : 'Bu boyutta en iyi süren bu.'}{' '}
            Hatasız ve gözünü kıpırdatmadan yapmak hızdan daha değerli.
          </Txt>
          <Button label="Yeniden" onPress={() => restart()} />
        </Card>
      ) : null}

      <Txt variant="dim" style={{ fontSize: 12, marginTop: theme.space(4) }}>
        Not: Schulte tablosu dikkat ve çevresel görüş için iyi bir ısınma; okuma hızını
        doğrudan artırdığına dair kanıt sınırlı. Gelişimini seviye testleri gösterir.
      </Txt>
    </Screen>
  );
}

function bestTimes(results: DrillResult[]): Record<number, number> {
  const best: Record<number, number> = {};
  for (const result of results) {
    if (result.drill !== 'schulte' || !result.size) continue;
    best[result.size] = Math.min(best[result.size] ?? Infinity, result.ms);
  }
  return best;
}
