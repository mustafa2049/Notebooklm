import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { transcribeImage } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import { pickPhotos, type PagePhoto } from '@/ingest/photo';
import { countWordsInText } from '@/ingest/normalize';
import { useSettings } from '@/store/SettingsContext';
import { formatNumber } from './format';
import { Button, Card, Field, Txt } from './primitives';
import { fontStyle } from './theme';

/**
 * İçe aktarma → Fotoğraf: basılı kitabın sayfalarını çek, yapay zekâ metne
 * çevirsin. Sayfalar sırayla okunur ve metin sırayla eklenir; sonuç kaydetmeden
 * önce düzeltilebilir. Yapay zekâ yoksa neden çalışmadığı söylenir.
 */

type Status = 'waiting' | 'reading' | 'done' | 'error';

interface PageState {
  photo: PagePhoto;
  status: Status;
}

const STATUS_LABEL: Record<Status, string> = {
  waiting: 'sırada',
  reading: 'okunuyor…',
  done: 'eklendi',
  error: 'okunamadı · tekrar dene',
};

export function PhotoImport({
  onSave,
  saving,
}: {
  onSave: (title: string, text: string) => void;
  saving: boolean;
}) {
  const router = useRouter();
  const { theme } = useSettings();
  const ai = useAi();
  const [pages, setPages] = useState<PageState[]>([]);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const working = useRef(false);

  // Sıradaki sayfayı oku: sayfalar tek tek, eklendikleri sırayla
  useEffect(() => {
    if (working.current) return;
    const next = pages.find((page) => page.status === 'waiting');
    if (!next) return;
    working.current = true;
    const id = next.photo.id;
    const mark = (status: Status) =>
      setPages((list) => list.map((page) => (page.photo.id === id ? { ...page, status } : page)));
    mark('reading');
    void ai
      .run((provider, signal) => transcribeImage(provider, next.photo.image, signal))
      .then((text) => {
        working.current = false;
        if (text === null) {
          mark('error');
          return;
        }
        setDraft((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
        mark('done');
      });
  }, [pages, ai]);

  const add = async (source: 'camera' | 'library') => {
    setPickError(null);
    try {
      const photos = await pickPhotos(source);
      if (photos.length) {
        setPages((list) => [...list, ...photos.map((photo) => ({ photo, status: 'waiting' as const }))]);
      }
    } catch (caught) {
      setPickError(caught instanceof Error ? caught.message : 'Fotoğraf alınamadı.');
    }
  };

  if (!ai.configured) {
    return (
      <Card style={{ gap: theme.space(3) }}>
        <Txt variant="heading">Fotoğraftan metin yapay zekâ ister</Txt>
        <Txt variant="dim">
          Basılı sayfanın fotoğrafını metne çevirmek için Ayarlar’dan bir yapay zekâ sağlayıcısı ve
          anahtarı tanımlaman gerekiyor. Telefonda Türkçe metin tanıma (OCR) çalıştırmak bu uygulama
          için fazla ağır; fotoğraf yalnızca seçtiğin sağlayıcıya gönderilir.
        </Txt>
        <Button label="Ayarlar’a git" variant="secondary" onPress={() => router.push('/settings')} />
      </Card>
    );
  }

  const pending = pages.some((page) => page.status === 'waiting' || page.status === 'reading');
  const words = countWordsInText(draft);

  return (
    <View style={{ gap: theme.space(3) }}>
      <Card style={{ gap: theme.space(2) }}>
        <Txt variant="heading">Kitabın sayfasını çek</Txt>
        <Txt variant="dim">
          Sayfaları sırayla ekle; her biri metne çevrilip alt alta eklenir. Düz, aydınlık ve tek
          sayfa çekmek en iyi sonucu verir. Fotoğraf yalnızca seçtiğin yapay zekâ sağlayıcısına
          gider; sayfa başına yaklaşık 2–3 bin token harcanır.
        </Txt>
      </Card>
      <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
        <Button label="Kamera" icon="camera" style={{ flex: 1 }} onPress={() => void add('camera')} />
        <Button label="Galeri" icon="image" variant="secondary" style={{ flex: 1 }} onPress={() => void add('library')} />
      </View>
      {pickError ? (
        <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
          {pickError}
        </Txt>
      ) : null}

      {pages.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(3) }}>
          {pages.map((page, index) => (
            <Pressable
              key={page.photo.id}
              disabled={page.status !== 'error'}
              onPress={() =>
                setPages((list) =>
                  list.map((item) => (item.photo.id === page.photo.id ? { ...item, status: 'waiting' } : item))
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Sayfa ${index + 1}: ${STATUS_LABEL[page.status]}`}
              style={{ width: 72, gap: 4 }}
            >
              <Image
                source={{ uri: page.photo.uri }}
                style={{
                  width: 72,
                  height: 96,
                  borderRadius: theme.radius.sm,
                  borderWidth: 2,
                  borderColor:
                    page.status === 'error'
                      ? theme.colors.danger
                      : page.status === 'done'
                        ? theme.colors.success
                        : theme.colors.border,
                }}
              />
              <Txt variant="dim" style={{ fontSize: 11 }} numberOfLines={2}>
                {index + 1} · {STATUS_LABEL[page.status]}
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      {pending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
          <ActivityIndicator color={theme.colors.accent} />
          <Txt variant="dim">Sayfa metne çevriliyor…</Txt>
        </View>
      ) : null}
      {ai.error ? (
        <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
          {ai.error}
        </Txt>
      ) : null}
      {ai.lastCall ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          Son sayfa: {ai.lastCall.tokens} token
          {ai.lastCall.cost ? ` · toplam harcama yaklaşık ${ai.lastCall.cost}` : ''}
        </Txt>
      ) : null}

      {draft || pages.length ? (
        <>
          <Field value={title} onChangeText={setTitle} label="Başlık" placeholder="Kitabın ya da bölümün adı" />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            placeholder="Metin burada belirecek; kaydetmeden önce düzeltebilirsin."
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
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {formatNumber(words)} kelime · {pages.filter((page) => page.status === 'done').length} sayfa
          </Txt>
          <Button
            label="Kütüphaneye ekle ve oku"
            disabled={saving || pending || words < 5}
            onPress={() => onSave(title.trim() || 'Fotoğraftan metin', draft)}
          />
        </>
      ) : null}
    </View>
  );
}
