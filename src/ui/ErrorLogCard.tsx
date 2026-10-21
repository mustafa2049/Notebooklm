import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { formatErrorLog, type ErrorEntry } from '@/core/errorLog';
import { useSettings } from '@/store/SettingsContext';
import { clearErrors, deviceInfo, listErrors } from '@/storage/errorLog';
import { Button, Card, Txt } from './primitives';
import { shareText } from './shareText';

/**
 * Ayarlar → Hata günlüğü: uygulamada olan hatalar (cihazda saklanır, yedeğe
 * girmez). Paylaşınca uygulama sürümü ve platformla birlikte düz metin gider;
 * metinlerin ve kişisel verilerin yoktur.
 */
export function ErrorLogCard() {
  const { theme } = useSettings();
  const [entries, setEntries] = useState<ErrorEntry[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    void listErrors().then(setEntries);
    setStatus(null);
  }, []);
  useFocusEffect(load);

  const share = async () => {
    const result = await shareText(formatErrorLog(entries ?? [], deviceInfo()));
    setStatus(result === 'copied' ? 'Günlük panoya kopyalandı.' : result === 'failed' ? 'Paylaşılamadı.' : null);
  };

  const count = entries?.length ?? 0;
  return (
    <Card style={{ gap: theme.space(3) }}>
      <Txt variant="dim">
        {count === 0
          ? 'Kayıtlı hata yok. Uygulamada bir sorun olursa burada görünür; paylaşıp geliştiriciye gönderebilirsin.'
          : `${count} hata kaydı. Paylaşınca uygulama sürümü ve hataların ayrıntısı gider; okuduğun metinler gitmez.`}
      </Txt>
      {entries?.slice(0, 3).map((entry) => (
        <View key={`${entry.at}-${entry.message}`} style={{ gap: 2 }}>
          <Txt variant="dim" style={{ fontSize: 12 }}>
            {new Date(entry.at).toLocaleString('tr-TR')}
            {entry.route ? ` · ${entry.route}` : ''}
          </Txt>
          <Txt variant="body" numberOfLines={2} style={{ fontSize: 13 }}>
            {entry.message}
          </Txt>
        </View>
      ))}
      {count > 0 ? (
        <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
          <Button label="Paylaş" icon="share" variant="secondary" style={{ flex: 1 }} onPress={() => void share()} />
          <Button
            label="Temizle"
            icon="trash"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => void clearErrors().then(load)}
          />
        </View>
      ) : null}
      {status ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          {status}
        </Txt>
      ) : null}
    </Card>
  );
}
