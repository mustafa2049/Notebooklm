import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listVocab, removeVocab, updateVocab, type VocabEntry } from '@/storage/vocab';
import { applyReview, dueCount, sortForReview } from '@/train/review';
import { Button, Card, Chip, Divider, IconButton, Screen, Txt } from '@/ui/primitives';

/**
 * Kelime defteri: liste ve tekrar.
 *
 * Tekrar kartı kelimeyi gösterip cümlesini ve notu gizliyor; kullanıcı önce
 * hatırlamayı deniyor, sonra açıyor. "Biliyorum" dediğinde kelimenin tekrar
 * aralığı uzuyor (bkz. `src/train/review.ts`).
 */

type Mode = 'list' | 'review';

export default function VocabScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [entries, setEntries] = useState<VocabEntry[] | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const reload = () => listVocab().then(setEntries);
  useEffect(() => {
    reload();
  }, []);

  const now = Date.now();
  const queue = useMemo(
    () => (entries ? sortForReview(entries, now) : []),
    // `now` bilerek bağımlılık değil: her render'da sıra değişmesin
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );
  const due = entries ? dueCount(entries, now) : 0;

  const answer = async (knew: boolean) => {
    const current = queue[cursor];
    if (!current) return;
    const updated = applyReview(current, knew, Date.now());
    await updateVocab(updated);
    setRevealed(false);
    setCursor((value) => value + 1);
    setEntries((list) =>
      list ? list.map((entry) => (entry.id === updated.id ? updated : entry)) : list
    );
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(4),
        }}
      >
        <Txt variant="title">Kelime defteri</Txt>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
      </View>

      {entries === null ? (
        <Txt variant="dim">Yükleniyor…</Txt>
      ) : entries.length === 0 ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Defter boş</Txt>
          <Txt variant="dim">
            Okurken bir kelimeye uzun bas, açılan panelden “Deftere kaydet”e dokun. Kelime
            geçtiği cümleyle birlikte buraya düşer.
          </Txt>
          <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: theme.space(2), marginBottom: theme.space(4) }}>
            <Chip
              label={`Liste (${entries.length})`}
              active={mode === 'list'}
              onPress={() => setMode('list')}
            />
            <Chip
              label={`Tekrar (${due})`}
              active={mode === 'review'}
              onPress={() => {
                setMode('review');
                setCursor(0);
                setRevealed(false);
              }}
            />
          </View>

          {mode === 'list'
            ? entries.map((entry) => (
                <Card key={entry.id} style={{ marginBottom: theme.space(3), gap: theme.space(1) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Txt variant="body" style={{ flex: 1, fontSize: 16 }}>
                      {entry.word}
                    </Txt>
                    <Txt
                      variant="dim"
                      style={{ fontSize: 12, color: theme.colors.danger }}
                      onPress={async () => {
                        await removeVocab(entry.id);
                        reload();
                      }}
                    >
                      sil
                    </Txt>
                  </View>
                  {entry.note ? <Txt variant="dim">{entry.note}</Txt> : null}
                  <Txt variant="dim" style={{ fontSize: 12 }}>
                    “{entry.sentence}”
                  </Txt>
                  <Txt variant="dim" style={{ fontSize: 11, color: theme.colors.textFaint }}>
                    {entry.docTitle ? `${entry.docTitle} · ` : ''}
                    {entry.known ? `${entry.reviews} doğru tekrar` : 'henüz öğrenilmedi'}
                  </Txt>
                </Card>
              ))
            : null}

          {mode === 'review' ? (
            cursor >= queue.length ? (
              <Card style={{ gap: theme.space(3) }}>
                <Txt variant="heading">Tur bitti</Txt>
                <Txt variant="dim">
                  Bu turdaki kelimeler bitti. Bildiğin kelimeler daha uzun aralıkla, bilmediklerin
                  daha sık sorulacak.
                </Txt>
                <Button
                  label="Baştan"
                  variant="secondary"
                  onPress={() => {
                    setCursor(0);
                    setRevealed(false);
                  }}
                />
              </Card>
            ) : (
              <Card style={{ gap: theme.space(4) }}>
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  {cursor + 1} / {queue.length}
                </Txt>
                <Txt variant="title" style={{ fontSize: 26 }}>
                  {queue[cursor].word}
                </Txt>

                {revealed ? (
                  <>
                    <Divider />
                    {queue[cursor].note ? <Txt variant="body">{queue[cursor].note}</Txt> : null}
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      “{queue[cursor].sentence}”
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
                      <Button
                        label="Bilmiyorum"
                        variant="secondary"
                        style={{ flex: 1 }}
                        onPress={() => answer(false)}
                      />
                      <Button label="Biliyorum" style={{ flex: 1 }} onPress={() => answer(true)} />
                    </View>
                  </>
                ) : (
                  <Button label="Göster" variant="secondary" onPress={() => setRevealed(true)} />
                )}
              </Card>
            )
          ) : null}
        </>
      )}
    </Screen>
  );
}
