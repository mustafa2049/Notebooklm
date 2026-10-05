import React, { useState } from 'react';
import { View } from 'react-native';
import { summarizeBackup, type Backup } from '@/backup/format';
import { useSettings } from '@/store/SettingsContext';
import { exportBackup, pickBackup, restoreBackup } from '@/storage/backup';
import { loadSettings } from '@/storage/settings';
import { Button, Toggle, Txt } from './primitives';

/**
 * Ayarlar → Veriler: yedeği dışa ver / geri yükle.
 *
 * Geri yükleme iki adımlı: önce dosyada ne olduğu gösterilir, kullanıcı onaylar.
 * Birleştirme cihazdaki hiçbir kaydı silmez.
 */

type State =
  | { step: 'idle'; message?: string; error?: boolean }
  | { step: 'busy'; label: string }
  | { step: 'confirm'; backup: Backup; includeSettings: boolean };

export function BackupCard() {
  const { theme, update } = useSettings();
  const [state, setState] = useState<State>({ step: 'idle' });

  const onExport = async () => {
    setState({ step: 'busy', label: 'Yedek hazırlanıyor…' });
    try {
      const { fileName, bytes } = await exportBackup();
      setState({ step: 'idle', message: `${fileName} hazır (${formatSize(bytes)}).` });
    } catch (error) {
      setState({ step: 'idle', error: true, message: `Yedek alınamadı: ${messageOf(error)}` });
    }
  };

  const onPick = async () => {
    try {
      const result = await pickBackup();
      if (!result) return;
      if (!result.ok) {
        setState({ step: 'idle', error: true, message: result.error });
        return;
      }
      setState({ step: 'confirm', backup: result.backup, includeSettings: false });
    } catch (error) {
      setState({ step: 'idle', error: true, message: `Dosya açılamadı: ${messageOf(error)}` });
    }
  };

  const onRestore = async (backup: Backup, includeSettings: boolean) => {
    setState({ step: 'busy', label: 'Geri yükleniyor…' });
    try {
      const report = await restoreBackup(backup, { includeSettings });
      if (includeSettings) update(await loadSettings());
      setState({
        step: 'idle',
        message:
          report.changedKeys === 0 && report.addedTexts === 0
            ? 'Yedekteki her şey zaten bu cihazda vardı.'
            : `Geri yüklendi${report.addedTexts ? ` · ${report.addedTexts} metin eklendi` : ''}.`,
      });
    } catch (error) {
      setState({ step: 'idle', error: true, message: `Geri yüklenemedi: ${messageOf(error)}` });
    }
  };

  if (state.step === 'confirm') {
    const summary = summarizeBackup(state.backup);
    const backup = state.backup;
    return (
      <View style={{ gap: theme.space(3) }}>
        <Txt variant="heading">Yedekte neler var?</Txt>
        <Txt variant="dim">
          {new Date(backup.createdAt).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          tarihli yedek: {summary.documents} metin, {summary.sessions} okuma oturumu,{' '}
          {summary.assessments} ölçüm, {summary.vocab} kelime
          {summary.highlights ? `, ${summary.highlights} alıntı` : ''}.
        </Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          Bu cihazdakilerle birleştirilir; hiçbir kayıt silinmez, aynı kayıt iki kez eklenmez.
        </Txt>
        {summary.hasSettings ? (
          <Toggle
            label="Ayarları da al"
            hint="Hız, görünüm ve hedefler yedektekiyle değişir. API anahtarı yedekte yoktur."
            value={state.includeSettings}
            onChange={(includeSettings) => setState({ ...state, includeSettings })}
          />
        ) : null}
        <Button
          label="Geri yükle"
          icon="upload"
          onPress={() => void onRestore(backup, state.includeSettings)}
        />
        <Button label="Vazgeç" variant="ghost" onPress={() => setState({ step: 'idle' })} />
      </View>
    );
  }

  const busy = state.step === 'busy';
  return (
    <View style={{ gap: theme.space(3) }}>
      <Txt variant="dim" style={{ fontSize: 13 }}>
        Tarayıcı verisi silinir ya da telefon değişirse seri, ölçümler ve kütüphane gider. Ara
        sıra yedek al. Yedek dosyası metinlerini ve geçmişini içerir; API anahtarın girmez.
      </Txt>
      <Button
        label={busy ? state.label : 'Yedeği dışa aktar'}
        icon="download"
        variant="secondary"
        disabled={busy}
        onPress={() => void onExport()}
      />
      <Button
        label="Yedekten geri yükle"
        icon="upload"
        variant="secondary"
        disabled={busy}
        onPress={() => void onPick()}
      />
      {state.step === 'idle' && state.message ? (
        <Txt
          variant="dim"
          style={{ fontSize: 13, color: state.error ? theme.colors.warning : theme.colors.success }}
        >
          {state.message}
        </Txt>
      ) : null}
    </View>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
