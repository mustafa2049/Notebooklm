import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askAboutText, explainWord, generateSections, generateSummary, type Section } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import { createSearchIndex, MIN_QUERY, searchText } from '@/core/search';
import { DictOfflineError, entryNote, lookupExact, lookupWord, type DictResult } from '@/ingest/tdk';
import { useSettings } from '@/store/SettingsContext';
import { loadAiCache, patchAiCache, type AiChatTurn } from '@/storage/ai';
import type { Bookmark } from '@/storage/bookmarks';
import { addHighlight } from '@/storage/highlights';
import { addVocab } from '@/storage/vocab';
import { previewOfText } from '@/train/drills/reading';
import { Button, Card, Chip, Divider, Field, IconButton, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';

/**
 * Okuyucunun araç paneli: arama, yer imleri, önizleme, kelime defteri ve
 * alıntı her zaman; özet / bölümler / sohbet ise yalnızca yapay zekâ ayarlıysa.
 *
 * Üç kural panelin tamamına hâkim:
 * 1. **AI olmadan da işe yarar.** Arama, yer imleri, kelime ve alıntı anahtar
 *    gerektirmiyor: kelimeyi cümlesiyle deftere kaydetmek için modele ihtiyaç yok.
 * 2. **Bir kez üretilir, saklanır.** Özet ve bölümler doküman başına
 *    önbelleğe yazılır; her açılışta yeniden para harcanmaz. Kullanıcı isterse
 *    "yeniden üret" ile ödemeyi kendisi seçer.
 * 3. **Harcama görünür.** Her çağrıdan sonra kullanılan token (ve fiyat
 *    girilmişse tutar) panelin altında yazar.
 */

export type AiTab =
  | 'search'
  | 'bookmarks'
  | 'summary'
  | 'sections'
  | 'chat'
  | 'word'
  | 'quote'
  | 'preview';

/** Sekmeler bu sırayla gösterilir */
const TAB_LABEL: Record<AiTab, string> = {
  search: 'Ara',
  bookmarks: 'İmler',
  sections: 'Bölümler',
  preview: 'Önizle',
  summary: 'Özet',
  chat: 'Sohbet',
  word: 'Kelime',
  quote: 'Alıntı',
};

/** AI kapalıyken de çalışanlar; bölümler yalnızca dosyanın kendi bölümleri varsa. */
const OFFLINE_TABS: AiTab[] = ['search', 'bookmarks', 'preview', 'word', 'quote'];

/** Atlamanın nedeni: aramadan gelinince okuyucu bulunan cümleyi gösterir */
export type JumpReason = 'search' | 'bookmark' | 'section';

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
  /** Cümlenin metindeki başlangıcı — alıntıya dokununca buraya dönülür */
  sentenceOffset: number;
  /** Alıntı kaydedilince okuyucu işaretleri yenilesin */
  onHighlightSaved?: () => void;
  /**
   * Sayfa modunda sayfadaki cümleler. Verilirse Kelime ve Alıntı sekmeleri
   * önce "hangi cümle?" diye sorar — sayfada tek bir "o anki cümle" yok.
   */
  sentenceChoices?: SentenceChoice[];
  /** Bölüm başına, arama sonucuna, yer imine atlama */
  onJumpTo: (charOffset: number, reason: JumpReason) => void;
  /** Bu kitabın yer imleri, metindeki sırasıyla */
  bookmarks?: Bookmark[];
  onRemoveBookmark?: (id: string) => void;
  /** Konumu kullanıcıya göstermek için ("Sayfa 12" ya da "%34") */
  positionLabel?: (charOffset: number) => string;
  /** Kelime defteri kaydında kaynağı göstermek için */
  docTitle?: string;
  /**
   * Kaynağın kendi bölümleri (EPUB içindekiler tablosu). Varsa AI bölümlemesi
   * yerine bunlar gösteriliyor — uydurulmuş değil, dosyadan geliyorlar.
   */
  fileChapters?: Section[];
}

export interface SentenceChoice {
  text: string;
  offset: number;
  words: string[];
}

export function ToolSheet({
  visible,
  onClose,
  docId,
  text,
  initialTab,
  charOffset,
  words,
  sentence,
  sentenceOffset,
  onHighlightSaved,
  sentenceChoices,
  onJumpTo,
  bookmarks = [],
  onRemoveBookmark,
  positionLabel,
  docTitle,
  fileChapters,
}: Props) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const ai = useAi();
  const [tab, setTab] = useState<AiTab>(initialTab);
  // Önizleme metnin başından: uzun kitapta da hızlı kalsın diye ilk ~60 bin karakter
  const outline = useMemo(() => (visible ? previewOfText(text.slice(0, 60000)) : []), [visible, text]);

  const [summary, setSummary] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[] | null>(null);
  const [chat, setChat] = useState<AiChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [wordInfo, setWordInfo] = useState<{ word: string; text: string } | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  /** TDK sözlüğü: seçili kelime için sonuç */
  const [dict, setDict] = useState<DictState | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [quoteNote, setQuoteNote] = useState('');
  const [quoteSaved, setQuoteSaved] = useState(false);
  /** Sayfa modunda seçilen cümle (`sentenceChoices` içindeki sıra) */
  const [choice, setChoice] = useState<number | null>(null);
  const chosen: SentenceChoice | null = sentenceChoices
    ? choice !== null
      ? (sentenceChoices[choice] ?? null)
      : null
    : { text: sentence, offset: sentenceOffset, words };
  const activeSentence = chosen?.text ?? '';
  const activeWords = chosen?.words ?? [];
  const hasFileChapters = Boolean(fileChapters?.length);
  const tabs = (Object.keys(TAB_LABEL) as AiTab[]).filter(
    (option) =>
      ai.configured || OFFLINE_TABS.includes(option) || (option === 'sections' && hasFileChapters)
  );
  const where = (offset: number) =>
    positionLabel ? positionLabel(offset) : `%${Math.round((offset / Math.max(1, text.length)) * 100)}`;

  // ---- Arama: dizin sekme ilk açıldığında bir kez kurulur (uzun kitapta her
  // tuşta metni baştan işlememek için); yazarken liste geriden gelebilir
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [searchUsed, setSearchUsed] = useState(false);
  useEffect(() => {
    if (visible && tab === 'search') setSearchUsed(true);
  }, [visible, tab]);
  const searchIndex = useMemo(() => (searchUsed ? createSearchIndex(text) : null), [searchUsed, text]);
  const results = useMemo(
    () => (searchIndex ? searchText(searchIndex, deferredQuery) : null),
    [searchIndex, deferredQuery]
  );

  useEffect(() => {
    if (!visible) return;
    // AI kapalıyken istenen sekme yoksa aramaya düş
    setTab(tabs.includes(initialTab) ? initialTab : 'search');
    setSaved(null);
    setQuoteNote('');
    setQuoteSaved(false);
    setChoice(null);
    setSelectedWord(null);
    setDict(null);
  }, [visible, initialTab, ai.configured]);

  // Saklanmış çıktıları yükle: aynı özet için ikinci kez ödeme yapılmasın
  useEffect(() => {
    if (!visible || !ai.configured) return;
    loadAiCache(docId).then((cache) => {
      setSummary(cache.summary?.text ?? null);
      setSections(cache.sections?.items ?? null);
      setChat(cache.chat ?? []);
    });
  }, [visible, docId, ai.configured]);

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
    const value = await ai.run((provider, signal) => explainWord(provider, word, activeSentence, signal));
    if (value === null) return;
    setWordInfo({ word, text: value });
  };

  /** `word`: seçili kelime (defter kaydı buna bağlı); `exact`: önerilen başka kök */
  const lookUp = async (word: string, exact?: string) => {
    setDict({ word, status: 'loading' });
    try {
      const result = exact ? await lookupExact(exact) : await lookupWord(word);
      setDict(result ? { word, status: 'done', result } : { word, status: 'none' });
    } catch (error) {
      setDict({ word, status: error instanceof DictOfflineError ? 'offline' : 'error' });
    }
  };

  const save = async (word: string) => {
    const dictNote =
      dict?.status === 'done' && dict.word === word
        ? dict.result.entries.slice(0, 2).map(entryNote).join('\n')
        : undefined;
    await addVocab({
      word,
      sentence: activeSentence,
      // Kelime o an açıklanmışsa açıklama (yoksa sözlük anlamı) nota geçer
      note: wordInfo?.word === word ? wordInfo.text : dictNote,
      docId,
      docTitle,
    });
    setSaved(word);
  };

  const saveQuote = async () => {
    await addHighlight({
      docId,
      docTitle: docTitle ?? '',
      charOffset: chosen?.offset ?? sentenceOffset,
      sentence: activeSentence,
      note: quoteNote.trim() || undefined,
    });
    setQuoteSaved(true);
    onHighlightSaved?.();
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
            Araçlar
          </Txt>
          <Pressable onPress={onClose} hitSlop={10}>
            <Txt variant="dim">kapat</Txt>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
          {tabs.map((option) => (
            <Chip
              key={option}
              label={TAB_LABEL[option]}
              active={tab === option}
              onPress={() => setTab(option)}
            />
          ))}
        </View>

        <Divider />

        <ScrollView
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ gap: theme.space(3) }}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'search' ? (
            <>
              <Field
                value={query}
                onChangeText={setQuery}
                placeholder="Metinde ara…"
                right={
                  query ? (
                    <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Aramayı temizle">
                      <Txt variant="dim">temizle</Txt>
                    </Pressable>
                  ) : undefined
                }
              />
              {query.trim().length < MIN_QUERY ? (
                <Txt variant="dim">
                  En az iki harf yaz. Büyük/küçük harf fark etmez; Türkçe harf kullanmazsan
                  "ogretmen" yazınca "öğretmen" de bulunur.
                </Txt>
              ) : results && results.total === 0 ? (
                <Txt variant="dim">Bu metinde "{query.trim()}" geçmiyor.</Txt>
              ) : results ? (
                <Txt variant="dim" style={{ fontSize: 13 }}>
                  {results.total} sonuç
                  {results.total > results.hits.length ? ` · ilk ${results.hits.length} tanesi` : ''} ·
                  dokununca oraya gidersin
                </Txt>
              ) : null}
              {query.trim().length >= MIN_QUERY
                ? results?.hits.map((hit) => (
                    <Card
                      key={hit.start}
                      onPress={() => {
                        onJumpTo(hit.start, 'search');
                        onClose();
                      }}
                    >
                      <Txt variant="body" style={{ fontSize: 14 }}>
                        {hit.before}
                        <Text style={{ color: theme.colors.accent, ...fontStyle(theme, '700') }}>
                          {hit.match}
                        </Text>
                        {hit.after}
                      </Txt>
                      <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                        {where(hit.start)}
                      </Txt>
                    </Card>
                  ))
                : null}
            </>
          ) : null}

          {tab === 'bookmarks' ? (
            <>
              {bookmarks.length === 0 ? (
                <Txt variant="dim">
                  Henüz yer imi yok. Okurken başlıktaki yer imi düğmesine dokun: bulunduğun yer
                  buraya eklenir, dokununca geri dönersin.
                </Txt>
              ) : null}
              {bookmarks.map((bookmark) => (
                <Card
                  key={bookmark.id}
                  onPress={() => {
                    onJumpTo(bookmark.charOffset, 'bookmark');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" numberOfLines={2} style={{ fontSize: 14 }}>
                        {bookmark.excerpt || '…'}
                      </Txt>
                      <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                        {where(bookmark.charOffset)} ·{' '}
                        {new Date(bookmark.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Txt>
                    </View>
                    {onRemoveBookmark ? (
                      <IconButton
                        name="trash"
                        size={18}
                        emphasis="faint"
                        accessibilityLabel="Yer imini sil"
                        onPress={() => onRemoveBookmark(bookmark.id)}
                      />
                    ) : null}
                  </View>
                </Card>
              ))}
            </>
          ) : null}

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
              {hasFileChapters ? (
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  Bu bölümler dosyanın içindekiler tablosundan geliyor.
                </Txt>
              ) : null}
              {(hasFileChapters ? fileChapters! : (sections ?? [])).length ? (
                (hasFileChapters ? fileChapters! : sections!).map((section, index) => (
                  <Card
                    key={`${section.charOffset}-${index}`}
                    onPress={() => {
                      onJumpTo(section.charOffset, 'section');
                      onClose();
                    }}
                  >
                    <Txt variant="body">
                      {index + 1}. {section.title}
                    </Txt>
                    <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
                      {where(section.charOffset)} · atlamak için dokun
                    </Txt>
                  </Card>
                ))
              ) : (
                <Txt variant="dim">
                  Başlıksız uzun metni bölümlere ayırır ve her bölüme başlık verir; sonra
                  dokunarak o bölüme atlayabilirsin.
                </Txt>
              )}
              {/* Dosyanın kendi bölümleri varken modele para vermenin anlamı yok */}
              {hasFileChapters ? null : (
                <Button
                  label={sections?.length ? 'Yeniden üret' : 'Bölümlere ayır'}
                  icon="sparkle"
                  variant={sections?.length ? 'secondary' : 'primary'}
                  disabled={ai.busy}
                  onPress={makeSections}
                />
              )}
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

          {tab === 'preview' ? (
            <>
              <Txt variant="dim">
                Her paragrafın ilk cümlesi: metnin iskeleti. Okumadan önce bakmak nereye
                gittiğini bilerek okumanı sağlar.
              </Txt>
              {outline.slice(0, 40).map((sentence, index) => (
                <Txt key={index} variant="body" style={{ fontSize: 14 }}>
                  {sentence}
                </Txt>
              ))}
              {outline.length > 40 ? (
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  … ve {outline.length - 40} paragraf daha
                </Txt>
              ) : null}
            </>
          ) : null}

          {(tab === 'word' || tab === 'quote') && sentenceChoices && choice === null ? (
            <>
              <Txt variant="dim">Hangi cümle? Sayfadaki cümlelerden birine dokun.</Txt>
              {sentenceChoices.map((item, index) => (
                <Card key={`${item.offset}-${index}`} onPress={() => setChoice(index)}>
                  <Txt variant="body" numberOfLines={3} style={{ fontSize: 14 }}>
                    {item.text}
                  </Txt>
                </Card>
              ))}
            </>
          ) : null}

          {(tab === 'word' || tab === 'quote') && sentenceChoices && choice !== null ? (
            <Pressable
              onPress={() => {
                setChoice(null);
                setSelectedWord(null);
                setQuoteSaved(false);
              }}
              hitSlop={8}
            >
              <Txt variant="dim" style={{ fontSize: 13, color: theme.colors.accent }}>
                ‹ Başka bir cümle seç
              </Txt>
            </Pressable>
          ) : null}

          {tab === 'word' && chosen ? (
            <>
              <Txt variant="dim">
                {ai.configured
                  ? 'Ekrandaki kelimelerden birini seç: TDK sözlüğünde bakabilir, bulunduğu cümledeki anlamını açıklatabilir ya da deftere kaydedebilirsin.'
                  : 'Ekrandaki kelimelerden birini seç: TDK sözlüğünde bakabilir ya da cümlesiyle birlikte deftere kaydedebilirsin.'}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
                {activeWords.map((word, index) => (
                  <Chip
                    key={`${word}-${index}`}
                    label={word}
                    active={selectedWord === word}
                    onPress={() => {
                      setSelectedWord(word);
                      setSaved(null);
                      setDict(null);
                    }}
                  />
                ))}
              </View>
              {selectedWord ? (
                <Button
                  label="Sözlükte bak"
                  icon="search"
                  variant="secondary"
                  disabled={dict?.status === 'loading'}
                  onPress={() => lookUp(selectedWord)}
                />
              ) : null}
              {selectedWord && dict ? <DictCard state={dict} onLookUp={(root) => lookUp(selectedWord, root)} /> : null}
              {selectedWord ? (
                <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
                  <Button
                    label={saved === selectedWord ? 'Deftere eklendi' : 'Deftere kaydet'}
                    icon={saved === selectedWord ? 'check' : 'book'}
                    variant="secondary"
                    style={{ flex: 1 }}
                    disabled={saved === selectedWord}
                    onPress={() => save(selectedWord)}
                  />
                  {ai.configured ? (
                    <Button
                      label="Açıkla"
                      icon="sparkle"
                      style={{ flex: 1 }}
                      disabled={ai.busy}
                      onPress={() => explain(selectedWord)}
                    />
                  ) : null}
                </View>
              ) : null}
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
              {activeSentence ? (
                <Txt variant="dim" style={{ fontSize: 12 }}>
                  Bağlam: {activeSentence}
                </Txt>
              ) : null}
            </>
          ) : null}

          {tab === 'quote' && chosen ? (
            <>
              <Txt variant="dim">
                Önemli bulduğun cümlenin altını çiz. Alıntılar defterinde kitap kitap birikir;
                dokununca metindeki yerine dönersin.
              </Txt>
              {activeSentence ? (
                <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.accent }}>
                  <Txt variant="body" style={{ fontSize: 15 }}>
                    {activeSentence}
                  </Txt>
                </Card>
              ) : null}
              <Field
                value={quoteNote}
                onChangeText={(value) => {
                  setQuoteNote(value);
                  setQuoteSaved(false);
                }}
                placeholder="Not ekle (isteğe bağlı): neden önemli?"
                multiline
              />
              <Button
                label={quoteSaved ? 'Alıntılara eklendi' : 'Alıntıyı kaydet'}
                icon={quoteSaved ? 'check' : 'quote'}
                disabled={quoteSaved || !activeSentence}
                onPress={() => void saveQuote()}
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

type DictState =
  | { word: string; status: 'loading' }
  | { word: string; status: 'done'; result: DictResult }
  | { word: string; status: 'none' | 'offline' | 'error' };

/** TDK sonucu: madde, köken, en çok 3 anlam (tür + örnek), başka kökler */
function DictCard({ state, onLookUp }: { state: DictState; onLookUp: (word: string) => void }) {
  const { theme } = useSettings();
  if (state.status === 'loading') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
        <ActivityIndicator color={theme.colors.accent} />
        <Txt variant="dim">Sözlükte aranıyor…</Txt>
      </View>
    );
  }
  if (state.status !== 'done') {
    return (
      <Txt variant="dim">
        {state.status === 'none'
          ? `"${state.word}" sözlükte bulunamadı. Özel ad ya da çok çekimli bir biçim olabilir.`
          : state.status === 'offline'
            ? 'Sözlüğe ulaşılamadı. İnternet bağlantını kontrol et; daha önce bakılan kelimeler çevrimdışı da açılır.'
            : 'Sözlük yanıtı okunamadı.'}
      </Txt>
    );
  }
  const { result } = state;
  return (
    <Card style={{ gap: theme.space(2) }}>
      {result.entries.map((entry, entryIndex) => (
        <View key={`${entry.word}-${entryIndex}`} style={{ gap: theme.space(1) }}>
          <Txt variant="body" style={{ fontSize: 17, ...fontStyle(theme, '700') }}>
            {entry.word}
            {entry.origin ? (
              <Text style={{ color: theme.colors.textDim, fontSize: 13, ...fontStyle(theme, '400') }}>
                {'  '}
                {entry.origin}
              </Text>
            ) : null}
          </Txt>
          {entry.meanings.map((meaning, index) => (
            <View key={index}>
              <Txt variant="body" style={{ fontSize: 14 }}>
                {index + 1}.{' '}
                {meaning.tags.length ? (
                  <Text style={{ color: theme.colors.accent }}>{meaning.tags.join(', ')} · </Text>
                ) : null}
                {meaning.text}
              </Txt>
              {meaning.example ? (
                <Txt variant="dim" style={{ fontSize: 13, fontStyle: 'italic' }}>
                  “{meaning.example}”
                </Txt>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      {result.query !== result.entries[0]?.word ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          "{result.query}" biçiminin kökü olarak bulundu.
        </Txt>
      ) : null}
      {result.alternatives.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space(2) }}>
          <Txt variant="dim" style={{ fontSize: 12 }}>
            Başka kök:
          </Txt>
          {result.alternatives.map((word) => (
            <Chip key={word} label={word} active={false} onPress={() => onLookUp(word)} />
          ))}
        </View>
      ) : null}
      <Txt variant="dim" style={{ fontSize: 11 }}>
        Kaynak: TDK Güncel Türkçe Sözlük (sozluk.gov.tr)
      </Txt>
    </Card>
  );
}
