import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import {
  listDocumentsWithProgress,
  removeDocument,
  type DocumentMeta,
  type DocumentProgress,
} from '@/storage/documents';
import { Icon } from '@/ui/Icon';
import { formatNumber, formatPercent, formatShortDuration } from '@/ui/format';
import { Button, Card, IconButton, ProgressBar, Screen, Txt } from '@/ui/primitives';

const SOURCE_LABEL: Record<DocumentMeta['source'], string> = {
  paste: 'Yapıştırılan metin',
  txt: 'TXT dosyası',
  pdf: 'PDF',
  epub: 'EPUB',
  url: 'Bağlantı',
};

export default function LibraryScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [items, setItems] = useState<{ meta: DocumentMeta; progress: DocumentProgress | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    listDocumentsWithProgress().then((next) => {
      setItems(next);
      setLoading(false);
    });
  }, []);

  // Okuyucudan dönüldüğünde ilerleme güncellenmiş olur
  useFocusEffect(refresh);

  const confirmRemove = (meta: DocumentMeta) => {
    const remove = () => removeDocument(meta.id).then(refresh);
    if (Platform.OS === 'web') {
      // Alert.alert web'de düğme göstermiyor; tarayıcının kendi onayını kullan
      if (window.confirm(`"${meta.title}" silinsin mi?`)) remove();
      return;
    }
    Alert.alert('Silinsin mi?', meta.title, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(5),
        }}
      >
        <View>
          <Txt variant="title">Kütüphane</Txt>
          <Txt variant="dim">{settings.wpm} kelime/dakika hedefi</Txt>
        </View>
        <IconButton
          name="plus"
          size={28}
          emphasis="strong"
          onPress={() => router.push('/import')}
          accessibilityLabel="Metin ekle"
        />
      </View>

      {loading ? null : items.length === 0 ? (
        <EmptyState onAdd={() => router.push('/import')} />
      ) : (
        <View style={{ gap: theme.space(3) }}>
          {items.map(({ meta, progress }) => (
            <Card key={meta.id} onPress={() => router.push(`/reader/${meta.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space(3) }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="heading" numberOfLines={2}>
                    {meta.title}
                  </Txt>
                  <Txt variant="dim" style={{ marginTop: theme.space(1), fontSize: 13 }}>
                    {SOURCE_LABEL[meta.source]} · {formatNumber(meta.wordCount)} kelime · ~
                    {formatShortDuration((meta.wordCount / settings.wpm) * 60000)}
                  </Txt>
                </View>
                <IconButton
                  name="trash"
                  size={18}
                  emphasis="faint"
                  onPress={() => confirmRemove(meta)}
                  accessibilityLabel={`${meta.title} sil`}
                />
              </View>

              {progress && progress.ratio > 0.001 ? (
                <View style={{ marginTop: theme.space(3), gap: theme.space(1.5) }}>
                  <ProgressBar ratio={progress.ratio} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt variant="dim" style={{ fontSize: 12 }}>
                      {progress.finished ? 'Tamamlandı' : `${formatPercent(progress.ratio)} okundu`}
                    </Txt>
                    <Txt
                      variant="dim"
                      style={{ fontSize: 12, color: theme.colors.accent }}
                    >
                      Devam et →
                    </Txt>
                  </View>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { theme } = useSettings();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: theme.space(10), gap: theme.space(3) }}>
      <Icon name="library" size={40} color={theme.colors.textFaint} />
      <Txt variant="heading">Kütüphane boş</Txt>
      <Txt variant="dim" style={{ textAlign: 'center', maxWidth: 280 }}>
        Bir metin yapıştır, dosya yükle ya da bağlantı ver — hemen hızlı okumaya başla.
      </Txt>
      <Button label="Metin ekle" icon="plus" onPress={onAdd} style={{ marginTop: theme.space(2) }} />
    </Card>
  );
}
