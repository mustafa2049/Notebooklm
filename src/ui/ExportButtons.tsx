import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { exportNotes } from '@/storage/exportNotes';
import { Button, Txt } from './primitives';

const LABELS = {
  notlar: 'Notları dışa aktar (Markdown)',
  anki: "Kelimeleri Anki'ye aktar (CSV)",
} as const;

/**
 * Not dışa aktarma düğmeleri: Markdown (alıntılar, özetler, kelime defteri)
 * ve Anki için kelime CSV'si. Web'de dosya iner, telefonda paylaşım menüsü.
 */
export function ExportButtons({ kinds }: { kinds: (keyof typeof LABELS)[] }) {
  const { theme } = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <View style={{ gap: theme.space(2) }}>
      {kinds.map((kind) => (
        <Button
          key={kind}
          label={LABELS[kind]}
          icon="share"
          variant="secondary"
          onPress={() =>
            void exportNotes(kind)
              .then((file) => setStatus(Platform.OS === 'web' ? `${file.fileName} indirildi.` : null))
              .catch(() => setStatus('Dışa aktarılamadı.'))
          }
        />
      ))}
      {status ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          {status}
        </Txt>
      ) : null}
    </View>
  );
}
