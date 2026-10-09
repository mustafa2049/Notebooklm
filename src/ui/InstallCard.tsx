import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { promptInstall, usePwa } from '@/pwa/pwa';
import { useSettings } from '@/store/SettingsContext';
import { Button, Card, SectionHeader, Txt } from './primitives';

/**
 * Ayarlar → "Uygulama olarak kullan" (yalnızca web): ana ekrana ekleme ve
 * çevrimdışı önbelleğin durumu. Telefon uygulamasında gösterilmez.
 */
export function InstallCard() {
  const { theme } = useSettings();
  const pwa = usePwa();
  const [dismissed, setDismissed] = useState(false);

  if (Platform.OS !== 'web') return null;

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'dismissed') setDismissed(true);
  };

  const offline = !pwa.production
    ? { text: 'Çevrimdışı önbellek yalnızca yayınlanan sürümde çalışır; geliştirme sunucusunda kapalı.', ok: false }
    : !pwa.supported
      ? { text: 'Bu tarayıcı çevrimdışı kullanımı desteklemiyor.', ok: false }
      : pwa.offlineReady
        ? { text: '✓ Çevrimdışı hazır: uygulama bu cihaza kaydedildi, internetsiz de açılır.', ok: true }
        : { text: 'Çevrimdışı kullanım hazırlanıyor…', ok: false };

  return (
    <>
      <SectionHeader title="Uygulama olarak kullan" />
      <Card style={{ gap: theme.space(3) }}>
        {pwa.standalone ? (
          <Txt variant="body">Ana ekrandan açtın: uygulama tam ekran çalışıyor.</Txt>
        ) : (
          <>
            <Txt variant="body">
              Ana ekrana eklersen tam ekran açılır ve internet olmadan da çalışır. Android'de
              başka uygulamalardan "Paylaş" ile metin gönderebilirsin.
            </Txt>
            {pwa.installed ? (
              <Txt variant="dim" style={{ color: theme.colors.success }}>
                Eklendi. Ana ekrandaki Hızlı Okuma simgesinden aç.
              </Txt>
            ) : pwa.canInstall ? (
              <Button label="Ana ekrana ekle" icon="download" onPress={install} />
            ) : pwa.ios ? (
              <Txt variant="dim">
                Safari'de alttaki Paylaş düğmesine dokun, sonra "Ana Ekrana Ekle"yi seç.
              </Txt>
            ) : (
              <Txt variant="dim">
                {dismissed ? 'İstediğinde tarayıcı' : 'Tarayıcı'} menüsünden (⋮) "Uygulamayı yükle" ya
                da "Ana ekrana ekle"yi seç.
              </Txt>
            )}
          </>
        )}
        <View style={{ gap: theme.space(1) }}>
          <Txt variant="dim" style={{ fontSize: 13, color: offline.ok ? theme.colors.success : theme.colors.textDim }}>
            {offline.text}
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Kitapların zaten cihazında. İnternet isteyenler: bağlantıdan ve klasiklerden içe
            aktarma, yapay zekâ.
          </Txt>
        </View>
      </Card>
    </>
  );
}
