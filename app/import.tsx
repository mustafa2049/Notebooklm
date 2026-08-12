import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { countWordsInText, normalizeText } from '@/ingest/normalize';
import { extractUrl } from '@/ingest/fromUrl';
import { PDF_SUPPORTED, pickAndExtract } from '@/ingest/pickFile';
import { useSettings } from '@/store/SettingsContext';
import { addDocument, type DocumentSource } from '@/storage/documents';
import { Icon } from '@/ui/Icon';
import { deriveTitle, formatNumber } from '@/ui/format';
import { Button, Card, Chip, IconButton, Screen, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';
import { SAMPLE_TEXT } from '@/data/sampleText';

type Tab = 'paste' | 'file' | 'url';

export default function ImportScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [tab, setTab] = useState<Tab>('paste');
  const [pasted, setPasted] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (title: string, text: string, source: DocumentSource, sourceRef?: string) => {
    const normalized = normalizeText(text);
    const words = countWordsInText(normalized);
    if (words < 5) {
      setError('Metin çok kısa görünüyor.');
      return;
    }
    const meta = await addDocument({ title, text: normalized, source, sourceRef, wordCount: words });
    router.dismissTo('/');
    router.push(`/reader/${meta.id}`);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setBusy(false);
    }
  };

  const pasteWords = countWordsInText(pasted);

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
        <Txt variant="title">Metin ekle</Txt>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
      </View>

      <View style={{ flexDirection: 'row', gap: theme.space(2), marginBottom: theme.space(4) }}>
        <Chip label="Yapıştır" active={tab === 'paste'} onPress={() => setTab('paste')} />
        <Chip label="Dosya" active={tab === 'file'} onPress={() => setTab('file')} />
        <Chip label="Bağlantı" active={tab === 'url'} onPress={() => setTab('url')} />
      </View>

      {tab === 'paste' ? (
        <View style={{ gap: theme.space(3) }}>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            multiline
            textAlignVertical="top"
            placeholder="Okumak istediğin metni buraya yapıştır…"
            placeholderTextColor={theme.colors.textFaint}
            style={{
              minHeight: 220,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.space(4),
              color: theme.colors.text,
              fontSize: 15,
              lineHeight: 22,
              ...fontStyle(theme),
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              {formatNumber(pasteWords)} kelime
            </Txt>
            <Txt
              variant="dim"
              style={{ fontSize: 13, color: theme.colors.accent }}
              onPress={() => setPasted(SAMPLE_TEXT)}
            >
              Örnek metni dene
            </Txt>
          </View>
          <Button
            label="Kütüphaneye ekle ve oku"
            disabled={busy || pasteWords < 5}
            onPress={() => run(() => save(deriveTitle(pasted), pasted, 'paste'))}
          />
        </View>
      ) : null}

      {tab === 'file' ? (
        <View style={{ gap: theme.space(3) }}>
          <Card style={{ gap: theme.space(2) }}>
            <Icon name="file" size={28} color={theme.colors.textDim} />
            <Txt variant="heading">{PDF_SUPPORTED ? 'TXT, PDF veya EPUB' : 'TXT veya EPUB'}</Txt>
            <Txt variant="dim">
              {PDF_SUPPORTED
                ? 'PDF’lerde yalnızca metin katmanı okunur; taranmış (fotoğraf) belgeler desteklenmiyor. EPUB’larda bölümler sırayla birleştirilir.'
                : 'EPUB’larda bölümler sırayla birleştirilir. PDF okuma şu an yalnızca web sürümünde çalışıyor — pdf.js telefonun JavaScript motorunda çalışmıyor.'}
            </Txt>
          </Card>
          <Button
            label="Dosya seç"
            icon="file"
            disabled={busy}
            onPress={() =>
              run(async () => {
                const picked = await pickAndExtract();
                if (!picked) return;
                await save(
                  picked.title ?? picked.fileName,
                  picked.text,
                  picked.kind,
                  picked.fileName
                );
              })
            }
          />
        </View>
      ) : null}

      {tab === 'url' ? (
        <View style={{ gap: theme.space(3) }}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://ornek.com/makale"
            placeholderTextColor={theme.colors.textFaint}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.space(4),
              color: theme.colors.text,
              fontSize: 15,
              ...fontStyle(theme),
            }}
          />
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Web sürümünde tarayıcı kısıtı nedeniyle sayfa bir vekil sunucu üzerinden
            çekilir ({settings.urlProxy || 'ayarlanmadı'}). Telefonda doğrudan indirilir.
          </Txt>
          <Button
            label="Makaleyi getir"
            icon="globe"
            disabled={busy || url.trim().length < 4}
            onPress={() =>
              run(async () => {
                const article = await extractUrl(url, settings.urlProxy);
                await save(article.title ?? url, article.text, 'url', url);
              })
            }
          />
        </View>
      ) : null}

      {busy ? (
        <View style={{ flexDirection: 'row', gap: theme.space(3), marginTop: theme.space(5) }}>
          <ActivityIndicator color={theme.colors.accent} />
          <Txt variant="dim">İşleniyor…</Txt>
        </View>
      ) : null}

      {error ? (
        <Card
          style={{
            marginTop: theme.space(5),
            borderColor: theme.colors.danger,
            backgroundColor: 'transparent',
          }}
        >
          <Txt variant="body" style={{ color: theme.colors.danger }}>
            {error}
          </Txt>
        </Card>
      ) : null}
    </Screen>
  );
}
