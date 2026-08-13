import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askAboutText, explainWord, generateSections, generateSummary, type Section } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import { useSettings } from '@/store/SettingsContext';
import { loadAiCache, patchAiCache, type AiChatTurn } from '@/storage/ai';
import { Button, Card, Chip, Divider, Field, Txt } from '@/ui/primitives';

/**
 * Okuyucunun yapay zekâ paneli: özet, bölümler, sohbet ve kelime açıklaması.
 *
 * İki kural panelin tamamına hâkim:
 * 1. **Bir kez üretilir, saklanır.** Özet ve bölümler doküman başına
 *    önbelleğe yazılır; her açılışta yeniden para harcanmaz. Kullanıcı isterse
 *    "yeniden üret" ile ödemeyi kendisi seçer.
 * 2. **Harcama görünür.** Her çağrıdan sonra kullanılan token (ve fiyat
 *    girilmişse tutar) panelin altında yazar.
 */

export type AiTab = 'summary' | 'sections' | 'chat' | 'word';

const TAB_LABEL: Record<AiTab, string> = {
  summary: 'Özet',
  sections: 'Bölümler',
  chat: 'Sohbet',
  word: 'Kelime',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  docId: string;
  text: string;
  /** Panel açıldığında hangi sekme görünsün */
  initialTab: AiTab;
  /** Okunan yer — sohbette ilgili bölüm seçimi ve kelime bağlamı için */
  charOffset: number;
  /** Kelime sekmesi için: o an ekranda olan kelimeler ve içinde geçtiği cümle */
  words: string[];
  sentence: string;
  /** Bölüm başına atlama */
  onJumpTo: (charOffset: number) => void;
}

export function AiSheet({
  visible,
  onClose,
  docId,
  text,
  initialTab,
  charOffset,
  words,
  sentence,
  onJumpTo,
}: Props) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const ai = useAi();
  const [tab, setTab] = useState<AiTab>(initialTab);

  const [summary, setSummary] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[] | null>(null);
  const [chat, setChat] = useState<AiChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [wordInfo, setWordInfo] = useState<{ word: string; text: string } | null>(null);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  // Saklanmış çıktıları yükle: aynı özet için ikinci kez ödeme yapılmasın
  useEffect(() => {
    if (!visible) return;
    loadAiCache(docId).then((cache) => {
      setSummary(cache.summary?.text ?? null);
      setSections(cache.sections?.items ?? null);
      setChat(cache.chat ?? []);
    });
  }, [visible, docId]);

  const makeSummary = async () => {
    const value = await ai.run((provider, signal) => generateSummary(provider, text, signal));
    if (value === null) return;
    setSummary(value);
    await patchAiCache(docId, { summary: { text: value, model: '', at: Date.now() } });
  };

  const makeSections = async () => {
    const value = await ai.run((provider, signal) => generateSections(provider, text, signal));
    if (value === null) return;
    setSections(value);
    await patchAiCache(docId, { sections: { items: value, model: '', at: Date.now() } });
  };

  const ask = async () => {
    const asked = question.trim();
    if (!asked) return;
    setQuestion('');
    const history = chat.map((turn) => ({ role: turn.role, text: turn.text }));
    const value = await ai.run((provider, signal) =>
      askAboutText(provider, { text, question: asked, history, charOffset }, signal)
    );
    if (value === null) {
      setQuestion(asked); // Hata olduysa soruyu kaybetmesin
      return;
    }
    const next: AiChatTurn[] = [
      ...chat,
      { role: 'user', text: asked, at: Date.now() },
      { role: 'assistant', text: `${value.text}\n\n(${value.passagesSent} bölüm gönderildi)`, at: Date.now() },
    ];
    setChat(next);
    await patchAiCache(docId, { chat: next });
  };

  const explain = async (word: string) => {
    const value = await ai.run((provider, signal) => explainWord(provider, word, sentence, signal));
    if (value === null) return;
    setWordInfo({ word, text: value });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000000AA' }} onPress={onClose} />
      <View
        style={{
          maxHeight: '85%',
          backgroundColor: theme.colors.bg,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          paddingTop: theme.space(4),
          paddingHorizontal: theme.space(4),
          paddingBottom: insets.bottom + theme.space(4),
          gap: theme.space(3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
          <Txt variant="heading" style={{ flex: 1, fontSize: 18 }}>
            Yapay zekâ
          </Txt>
          <Pressable onPress={onClose} hitSlop={10}>
            <Txt variant="dim">kapat</Txt>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
          {(Object.keys(TAB_LABEL) as AiTab[]).map((option) => (
            <Chip
              key={option}
              label={TAB_LABEL[option]}
              active={tab === option}
              onPress={() => setTab(option)}
            />
          ))}
        </View>

        <Divider />

        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: theme.space(3) }}>
          {tab === 'summary' ? (
            <>
              {summary ? (
                <Card>
                  <Txt variant="body">{summary}</Txt>
                </Card>
              ) : (
                <Txt variant="dim">
                  Metnin kısa bir özetini çıkarır: ne hakkında olduğunu okumaya başlamadan
                  önce görürsün. Bir kez üretilir ve saklanır.
                </Txt>
              )}
              <Button
                label={summary ? 'Yeniden üret' : 'Özet çıkar'}
                icon="sparkle"
                variant={summary ? 'secondary' : 'primary'}
                disabled={ai.busy}
                onPress={makeSummary}
              />
            </>
          ) : null}

          {tab === 'sections' ? (
            <>
              {sections?.length ? (
                sections.map((section, index) => (
                  <Card
                    key={`${section.charOffset}-${index}`}
                    onPress={() => {
                      onJumpTo(section.charOffset);
                      onClose();
                    }}
                  >
                    <Txt variant="body">
                      {index + 1}. {section.title}
                    </Txt>
                    <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                      %{Math.round((section.charOffset / Math.max(1, text.length)) * 100)} · atlamak
                      için dokun
                    </Txt>
                  </Card>
                ))
              ) : (
                <Txt variant="dim">
                  Başlıksız uzun metni bölümlere ayırır ve her bölüme başlık verir; sonra
                  dokunarak o bölüme atlayabilirsin.
                </Txt>
              )}
              <Button
                label={sections?.length ? 'Yeniden üret' : 'Bölümlere ayır'}
                icon="sparkle"
                variant={sections?.length ? 'secondary' : 'primary'}
                disabled={ai.busy}
                onPress={makeSections}
              />
            </>
          ) : null}

          {tab === 'chat' ? (
            <>
              {chat.length === 0 ? (
                <Txt variant="dim">
                  Metne soru sor. Tüm kitap değil, soruyla ilgili bölümler gönderilir —
                  hem daha ucuz hem daha isabetli. Kaç bölüm gönderildiğini yanıtta görürsün.
                </Txt>
              ) : null}
              {chat.map((turn, index) => (
                <View
                  key={`${turn.at}-${index}`}
                  style={{
                    backgroundColor: turn.role === 'user' ? theme.colors.surfaceAlt : theme.colors.surface,
                    borderRadius: theme.radius.md,
                    padding: theme.space(3),
                  }}
                >
                  <Txt variant="dim" style={{ fontSize: 11, marginBottom: 2 }}>
                    {turn.role === 'user' ? 'Sen' : 'Yanıt'}
                  </Txt>
                  <Txt variant="body">{turn.text}</Txt>
                </View>
              ))}
              <Field
                value={question}
                onChangeText={setQuestion}
                placeholder="Metne bir soru sor…"
                multiline
              />
              <Button label="Sor" icon="chat" disabled={ai.busy || !question.trim()} onPress={ask} />
            </>
          ) : null}

          {tab === 'word' ? (
            <>
              <Txt variant="dim">
                Ekrandaki kelimelerden birine dokun; bulunduğu cümledeki anlamıyla açıklanır.
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
                {words.map((word, index) => (
                  <Chip
                    key={`${word}-${index}`}
                    label={word}
                    active={wordInfo?.word === word}
                    onPress={() => explain(word)}
                  />
                ))}
              </View>
              {wordInfo ? (
                <Card>
                  <Txt variant="body" style={{ fontSize: 15 }}>
                    {wordInfo.word}
                  </Txt>
                  <Txt variant="dim" style={{ marginTop: theme.space(1) }}>
                    {wordInfo.text}
                  </Txt>
                </Card>
              ) : null}
              {sentence ? (
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  Bağlam: {sentence}
                </Txt>
              ) : null}
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

          {ai.lastCall ? (
            <Txt variant="dim" style={{ fontSize: 12 }}>
              Son çağrı: {ai.lastCall.tokens} token
              {ai.lastCall.cost ? ` · toplam yaklaşık ${ai.lastCall.cost}` : ''}
            </Txt>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
