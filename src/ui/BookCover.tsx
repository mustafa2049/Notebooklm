import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { generatedCover } from '@/habit/cover';
import { onCoverChange, readCover } from '@/storage/covers';
import { useSettings } from '@/store/SettingsContext';
import { fontStyle } from './theme';

/**
 * Kitap kapağı: saklı kapak (EPUB'dan ya da Open Library'den) varsa o,
 * yoksa ya da yüklenemezse (çevrimdışı) başlıktan üretilen renkli kapak.
 * Oran 2:3.
 */
export function BookCover({ docId, title, width }: { docId: string; title: string; width: number }) {
  const { theme } = useSettings();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.5);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      readCover(docId).then((value) => {
        if (cancelled) return;
        setUri(value);
        setFailed(false);
      });
    void load();
    const unsubscribe = onCoverChange((id) => {
      if (id === docId) void load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [docId]);

  const frame = {
    width,
    height,
    borderRadius: Math.max(3, width * 0.04),
    overflow: 'hidden' as const,
  };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        resizeMode="cover"
        style={{ ...frame, backgroundColor: theme.colors.surfaceAlt }}
        accessibilityLabel={`${title} kapağı`}
      />
    );
  }

  const cover = generatedCover(title);
  // ~11 karakterlik satır kapak genişliğine sığsın
  const fontSize = Math.max(4, width * 0.105 * cover.scale);
  return (
    <View
      accessibilityLabel={`${title} kapağı`}
      style={{ ...frame, backgroundColor: cover.palette.bg, padding: width * 0.09, justifyContent: 'space-between' }}
    >
      <View style={{ height: Math.max(2, width * 0.025), width: '40%', backgroundColor: cover.palette.accent }} />
      <View>
        {cover.lines.map((line, index) => (
          <Text
            key={index}
            numberOfLines={1}
            style={{
              color: cover.palette.fg,
              fontSize,
              lineHeight: fontSize * 1.2,
              ...fontStyle(theme, '700'),
            }}
          >
            {line}
          </Text>
        ))}
      </View>
      <View style={{ height: Math.max(1, width * 0.012), backgroundColor: cover.palette.accent, opacity: 0.6 }} />
    </View>
  );
}
