import React from 'react';
import { View } from 'react-native';
import { disableEasyReading, easyReadingSummary, enableEasyReading } from '@/appearance/easyReading';
import { useSettings } from '@/store/SettingsContext';
import { Toggle, Txt } from './primitives';

/**
 * "Kolay okuma" anahtarı: okunaklılık ayarlarını birlikte açar, kapatınca
 * önceki ayarları geri getirir. Görünüm paneli (okuyucu ve Ayarlar) ile ilk
 * açılış sihirbazı aynı bileşeni kullanır.
 */
export function EasyReadingToggle() {
  const { theme, appTheme, settings, update } = useSettings();

  const change = (on: boolean) => {
    if (on) {
      const { patch, backup } = enableEasyReading(settings, appTheme.dark);
      update({ ...patch, easyReading: true, easyBackup: backup });
    } else {
      update({ ...disableEasyReading(settings.easyBackup), easyReading: false, easyBackup: null });
    }
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: settings.easyReading ? theme.colors.accent : theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.space(3),
      }}
    >
      <Toggle
        label="Kolay okuma"
        hint={
          settings.easyReading
            ? 'Kapatınca önceki görünüm ayarların geri gelir.'
            : 'Tek dokunuşla daha rahat okunan görünüm: büyük yazı, geniş aralıklar, disleksi dostu yazı tipi, sola yaslı metin, göz yormayan zemin.'
        }
        value={settings.easyReading}
        onChange={change}
      />
      {settings.easyReading ? (
        <Txt variant="dim" style={{ fontSize: 12, marginTop: -theme.space(2), marginBottom: theme.space(3) }}>
          {easyReadingSummary(settings)}
        </Txt>
      ) : null}
    </View>
  );
}
