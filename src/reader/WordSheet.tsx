import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { explainWord } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import type { SentenceInfo } from '@/core/wordHit';
import { DictOfflineError, entryNote, lookupExact, lookupWord } from '@/ingest/tdk';
import { useSettings } from '@/store/SettingsContext';
import { addHighlight } from '@/storage/highlights';
import { addVocab } from '@/storage/vocab';
import { Button, Card, Chip, Txt } from '@/ui/primitives';
import { DictCard, type DictState } from './DictCard';

/**
 * Kelimeye uzun basınca açılan sayfa: kelimenin TDK anlamı hemen gelir.
 *
 * Kelime yanlış bulunduysa (telefonda satır içi konum tahmin) cümlenin
 * kelimelerinden doğrusuna tek dokunuşla geçilir. Buradan deftere kaydedilir
 * (anlam not olur), yapay zekâyla bağlamına göre açıklatılır, cümle alıntılanır
 * ya da eski araç paneline geçilir.
 */
export function WordSheet({
  visible,
  word,
  sentence,
  docId,
  docTitle,
  onClose,
  onMoreTools,
  onSimplify,
  onHighlightSaved,
}: {
  visible: boolean;
  word: string;
  sentence: SentenceInfo;
  docId: string;
  docTitle: string;
  onClose: () => void;
  /** Araç paneli (alıntıya not, arama, AI araçları) */
  onMoreTools: () => void;
  /** Verilirse: okunan sayfayı/paragrafı yapay zekâyla sadeleştir */
  onSimplify?: () => void;
  onHighlightSaved?: () => void;
}) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const ai = useAi();
  const [selected, setSelected] = useState(word);
  const [dict, setDict] = useState<DictState | null>(null);
  const [explanation, setExplanation] = useState<{ word: string; text: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [quoted, setQuoted] = useState(false);
  /** Hızlı çip değiştirmede geç gelen eski yanıt yenisinin üstüne yazmasın */
  const request = useRef(0);

  const lookUp = useCallback(async (target: string, exact?: string) => {
    const id = ++request.current;
    setDict({ word: target, status: 'loading' });
    try {
      const result = exact ? await lookupExact(exact) : await lookupWord(target);
      if (id !== request.current) return;
      setDict(result ? { word: target, status: 'done', result } : { word: target, status: 'none' });
    } catch (error) {
      if (id !== request.current) return;
      setDict({ word: target, status: error instanceof DictOfflineError ? 'offline' : 'error' });
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSelected(word);
    setExplanation(null);
    setSaved(null);
    setQuoted(false);
    void lookUp(word);
  }, [visible, word, lookUp]);

  const choose = (next: string) => {
    if (next === selected) return;
    setSelected(next);
    setSaved(null);
    void lookUp(next);
  };

  const explain = async () => {
    const target = selected;
    const value = await ai.run((provider, signal) => explainWord(provider, target, sentence.text, signal));
    if (value !== null) setExplanation({ word: target, text: value });
  };

  const save = async () => {
    const dictNote =
      dict?.status === 'done' && dict.word === selected
        ? dict.result.entries.slice(0, 2).map(entryNote).join('\n')
        : undefined;
    await addVocab({
      word: selected,
      sentence: sentence.text,
      // Açıklama varsa o (bağlama göre), yoksa sözlük anlamı not olur
      note: explanation?.word === selected ? explanation.text : dictNote,
      docId,
      docTitle,
    });
    setSaved(selected);
  };

  const quote = async () => {
    await addHighlight({ docId, docTitle, charOffset: sentence.offset, sentence: sentence.text });
    setQuoted(true);
    onHighlightSaved?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000000AA' }} onPress={onClose} accessibilityLabel="Kapat" />
      <View
        style={{
          maxHeight: '82%',
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
          <Txt variant="title" numberOfLines={1} style={{ flex: 1, fontSize: 24 }}>
            {selected}
          </Txt>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Txt variant="dim">kapat</Txt>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ gap: theme.space(3) }} keyboardShouldPersistTaps="handled">
          {dict ? <DictCard state={dict} onLookUp={(root) => void lookUp(selected, root)} /> : null}

          {explanation?.word === selected ? (
            <Card style={{ gap: theme.space(1) }}>
              <Txt variant="label">Bu cümlede</Txt>
              <Txt variant="body" style={{ fontSize: 15 }}>
                {explanation.text}
              </Txt>
            </Card>
          ) : null}
          {ai.busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Txt variant="dim">Açıklanıyor…</Txt>
            </View>
          ) : null}
          {ai.error ? (
            <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
              {ai.error}
            </Txt>
          ) : null}

          {sentence.words.length > 1 ? (
            <View style={{ gap: theme.space(2) }}>
              <Txt variant="dim" style={{ fontSize: 12 }}>
                Başka bir kelime mi? Cümledeki kelimeler:
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
                {sentence.words.slice(0, 40).map((item) => (
                  <Chip key={item} label={item} active={item === selected} onPress={() => choose(item)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
            <Button
              label={saved === selected ? 'Deftere eklendi' : 'Deftere kaydet'}
              icon={saved === selected ? 'check' : 'book'}
              variant="secondary"
              style={{ flex: 1 }}
              disabled={saved === selected}
              onPress={() => void save()}
            />
            {ai.configured ? (
              <Button label="Açıkla" icon="sparkle" style={{ flex: 1 }} disabled={ai.busy} onPress={() => void explain()} />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
            <Button
              label={quoted ? 'Alıntılandı' : 'Alıntıla'}
              icon={quoted ? 'check' : 'quote'}
              variant="secondary"
              style={{ flex: 1 }}
              disabled={quoted}
              onPress={() => void quote()}
            />
            <Button label="Diğer araçlar" variant="ghost" style={{ flex: 1 }} onPress={onMoreTools} />
          </View>
          {onSimplify && ai.configured ? (
            <Button label="Bu kısmı sadeleştir" icon="sparkle" variant="secondary" onPress={onSimplify} />
          ) : null}

          <Txt variant="dim" style={{ fontSize: 12 }}>
            Bağlam: {sentence.text}
          </Txt>
        </ScrollView>
      </View>
    </Modal>
  );
}
