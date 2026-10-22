import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { ownVoiceFor } from '@/voice/active';
import { OWN_VOICE_SUPPORTED } from '@/voice/backend';
import { deleteVoice, importVoice, pickVoice } from '@/voice/importVoice';
import { listVoices, onVoicesChanged, type VoiceEntry } from '@/voice/library';
import { Button, Card, Divider, Txt } from './primitives';

/**
 * Ayarlar → Ses: dinlerken okuyan ses. Cihazın sesi ya da içe aktarılan
 * kendi sesin (Piper ses paketi: .onnx + .onnx.json; bkz. `src/voice/`).
 */

const REPO = 'mustafa2049/Notebooklm';
const BRANCH = 'claude/speed-reading-app-plan-kzot5o';
/** Eğitim not defteri (Google Colab'da açılır) */
export const TRAINING_NOTEBOOK_URL = `https://colab.research.google.com/github/${REPO}/blob/${BRANCH}/voice-training/kendi-sesim.ipynb`;
/** Adım adım anlatım */
export const TRAINING_GUIDE_URL = `https://github.com/${REPO}/blob/${BRANCH}/voice-training/README.md`;

const SAMPLE = 'Merhaba! Bu benim sesim. Hızlı Okuma metinlerini artık bu sesle dinleyebilirsin.';

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(0)} MB`;

export function OwnVoiceCard() {
  const { theme, settings, update } = useSettings();
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const refresh = () => void listVoices().then(setVoices);
    refresh();
    return onVoicesChanged(refresh);
  }, []);

  if (!OWN_VOICE_SUPPORTED) {
    return (
      <Card>
        <Txt variant="dim">Kendi sesin bu cihazda desteklenmiyor; Android uygulamasında ve tarayıcıda çalışır.</Txt>
      </Card>
    );
  }

  const active = voices.find((voice) => voice.id === settings.ownVoiceId);

  const add = async () => {
    setMessage(null);
    try {
      const picked = await pickVoice();
      if (!picked) return;
      setBusy('Ses kaydediliyor…');
      const { entry, warnings } = await importVoice(picked, setBusy);
      update({ ownVoiceId: entry.id });
      setMessage({
        error: false,
        text: [`“${entry.name}” eklendi ve seçildi (doğal hızı ${entry.naturalWpm} kelime/dk).`, ...warnings].join(' '),
      });
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  };

  const tryVoice = async (entry: VoiceEntry) => {
    setMessage(null);
    setBusy('Ses açılıyor…');
    const state = await ownVoiceFor(entry.id);
    setBusy(null);
    if (!state.voice) {
      setMessage({ error: true, text: state.error ?? 'Ses açılamadı.' });
      return;
    }
    state.voice.speak(SAMPLE, {
      lengthScale: entry.config.lengthScale,
      onDone: () => undefined,
      onError: (error) => setMessage({ error: true, text: `Ses çalışmadı: ${error instanceof Error ? error.message : error}` }),
    });
  };

  const remove = async (entry: VoiceEntry) => {
    if (confirmDelete !== entry.id) {
      setConfirmDelete(entry.id);
      return;
    }
    setConfirmDelete(null);
    if (settings.ownVoiceId === entry.id) update({ ownVoiceId: '' });
    await deleteVoice(entry.id);
    setMessage({ error: false, text: `“${entry.name}” silindi.` });
  };

  return (
    <Card style={{ gap: theme.space(3) }}>
      <View style={{ gap: theme.space(1) }}>
        <Txt variant="body">Okuyan ses: {active ? `kendi sesin — ${active.name}` : 'cihazın sesi'}</Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          Dinleyerek okurken ve kelimenin okunuşunda kullanılır. Kendi sesin bu cihazda, internetsiz çalışır: sesinden
          bir kez eğitilen ses paketini (iki dosya: .onnx ve .onnx.json) buraya eklersin.
        </Txt>
      </View>

      {voices.map((voice) => (
        <View key={voice.id} style={{ gap: theme.space(2) }}>
          <Divider />
          <Txt variant="body">
            {voice.name}
            {voice.id === settings.ownVoiceId ? ' · seçili' : ''}
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {megabytes(voice.size)}
            {voice.naturalWpm ? ` · doğal hızı ${voice.naturalWpm} kelime/dk` : ''}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            <Button label="Dene" icon="play" variant="secondary" disabled={Boolean(busy)} onPress={() => void tryVoice(voice)} />
            {voice.id !== settings.ownVoiceId ? (
              <Button label="Kullan" icon="check" variant="secondary" onPress={() => update({ ownVoiceId: voice.id })} />
            ) : null}
            <Button
              label={confirmDelete === voice.id ? 'Silmeyi onayla' : 'Sil'}
              icon="trash"
              variant={confirmDelete === voice.id ? 'danger' : 'ghost'}
              onPress={() => void remove(voice)}
            />
          </View>
        </View>
      ))}

      {active ? (
        <Button label="Cihazın sesine dön" variant="secondary" onPress={() => update({ ownVoiceId: '' })} />
      ) : null}
      <Button label={busy ?? 'Ses paketi ekle'} icon="plus" disabled={Boolean(busy)} onPress={() => void add()} />
      {message ? (
        <Txt variant="dim" style={{ fontSize: 13, color: message.error ? theme.colors.danger : theme.colors.textDim }}>
          {message.text}
        </Txt>
      ) : null}

      <Divider />
      <Pressable onPress={() => setGuide((open) => !open)} accessibilityRole="button" hitSlop={8}>
        <Txt variant="body" style={{ color: theme.colors.accent }}>
          {guide ? '▾' : '▸'} Sesini nasıl eğitirsin?
        </Txt>
      </Pressable>
      {guide ? (
        <View style={{ gap: theme.space(2) }}>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            1. Sessiz bir odada kendi sesinle 10–30 saniyelik bir kayıt yap (not defterindeki paragrafı oku).{'\n'}
            2. Eğitim not defterini Google Colab'da aç, adımları sırayla çalıştır: kaydından ~1.300 cümle üretilir,
            sonra küçük bir ses modeli eğitilir (ücretsiz ekran kartıyla birkaç saat).{'\n'}
            3. Sonunda Google Drive'ına iki dosya kaydedilir: .onnx ve .onnx.json.{'\n'}
            4. İkisini bu cihaza indir, "Ses paketi ekle" ile ikisini birlikte seç.
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Yalnızca kendi sesini ya da izin veren birinin sesini kullan. Eğitimde Türkçe dfki sesi başlangıç noktası
            olduğu için ortaya çıkan ses kişisel kullanım içindir.
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            <Button label="Not defterini aç (Colab)" icon="globe" variant="secondary" onPress={() => void Linking.openURL(TRAINING_NOTEBOOK_URL)} />
            <Button label="Adım adım anlatım" icon="book" variant="ghost" onPress={() => void Linking.openURL(TRAINING_GUIDE_URL)} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
