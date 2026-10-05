import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evaluateRecall } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import type { RecallFeedback } from '@/ai/validate';
import { useSettings } from '@/store/SettingsContext';
import { addRecall, setRecallFeedback } from '@/storage/recalls';
import { Button, Card, Field, Txt } from '@/ui/primitives';

/**
 * Okuduktan sonra "kendi cümlenle anlat" kartı.
 *
 * Hatırlamaya çalışmak, okuduğunu kalıcı kılmanın en ucuz yolu. Kart ısrar
 * etmez: "Geç" her zaman bir dokunuş uzakta. AI tanımlıysa özet okunan bölümle
 * karşılaştırılır; değilse yalnızca saklanır ve alıntı defterinde görünür.
 */

interface Props {
  visible: boolean;
  docId: string;
  docTitle: string;
  text: string;
  fromChar: number;
  toChar: number;
  /** Kart kapanınca (kaydedilse de geçilse de) */
  onDone: () => void;
  /** Kapatınca okuyucudan çıkılacaksa düğme metni buna göre */
  leaving: boolean;
}

export function RecallCard({ visible, docId, docTitle, text, fromChar, toChar, onDone, leaving }: Props) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const ai = useAi();
  const [summary, setSummary] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RecallFeedback | null>(null);

  const save = async () => {
    const recall = await addRecall({ docId, docTitle, fromChar, toChar, text: summary.trim() });
    setSavedId(recall.id);
  };

  const evaluate = async () => {
    if (!savedId) return;
    const value = await ai.run((provider, signal) =>
      evaluateRecall(provider, { text, fromChar, toChar, summary }, signal)
    );
    if (!value) return;
    setFeedback(value);
    await setRecallFeedback(savedId, value);
  };

  const closeLabel = leaving ? 'Çık' : 'Okumaya dön';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDone}>
      <Pressable style={{ flex: 1, backgroundColor: '#000000AA' }} onPress={onDone} />
      <View
        style={{
          maxHeight: '85%',
          backgroundColor: theme.colors.bg,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          paddingTop: theme.space(4),
          paddingHorizontal: theme.space(4),
          paddingBottom: insets.bottom + theme.space(4),
        }}
      >
        <ScrollView contentContainerStyle={{ gap: theme.space(3) }}>
          <Txt variant="heading" style={{ fontSize: 18 }}>
            Aklında ne kaldı?
          </Txt>

          {savedId === null ? (
            <>
              <Txt variant="dim">
                Okuduğunu bir iki cümleyle kendi sözlerinle anlat. Hatırlamaya çalışmak, okuduğunu
                kalıcı kılmanın en etkili yollarından biri.
              </Txt>
              <Field
                value={summary}
                onChangeText={setSummary}
                placeholder="Bu bölümde anlatılan…"
                multiline
              />
              <Button label="Kaydet" icon="check" disabled={!summary.trim()} onPress={() => void save()} />
              <Button label={`Geç · ${closeLabel.toLocaleLowerCase('tr')}`} variant="ghost" onPress={onDone} />
            </>
          ) : (
            <>
              <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.accent }}>
                <Txt variant="body">{summary.trim()}</Txt>
              </Card>
              <Txt variant="dim" style={{ fontSize: 13, color: theme.colors.success }}>
                Kaydedildi — Antrenman → Alıntılar'da bu metnin altında duruyor.
              </Txt>

              {feedback ? (
                <Card style={{ gap: theme.space(2) }}>
                  {feedback.feedback ? <Txt variant="body">{feedback.feedback}</Txt> : null}
                  {feedback.caught.length ? (
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      Yakaladıkların: {feedback.caught.join(' · ')}
                    </Txt>
                  ) : null}
                  {feedback.missed.length ? (
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      Gözden kaçanlar: {feedback.missed.join(' · ')}
                    </Txt>
                  ) : null}
                </Card>
              ) : ai.configured ? (
                <>
                  <Txt variant="dim" style={{ fontSize: 13 }}>
                    İstersen yapay zekâ özetini okuduğun bölümle karşılaştırsın: neyi yakaladın,
                    neyi kaçırdın. Yalnızca bu oturumda okuduğun kısım gönderilir.
                  </Txt>
                  <Button
                    label="Karşılaştır"
                    icon="sparkle"
                    variant="secondary"
                    disabled={ai.busy}
                    onPress={() => void evaluate()}
                  />
                </>
              ) : null}

              {ai.busy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
                  <ActivityIndicator color={theme.colors.accent} />
                  <Txt variant="dim">Model çalışıyor…</Txt>
                </View>
              ) : null}
              {ai.error ? (
                <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
                  {ai.error}
                </Txt>
              ) : null}

              <Button label={closeLabel} onPress={onDone} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
