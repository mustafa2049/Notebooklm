import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { DictResult } from '@/ingest/tdk';
import { useSettings } from '@/store/SettingsContext';
import { Card, Chip, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';

/**
 * TDK sözlük sonucu kartı: madde, köken, en çok 3 anlam (tür + örnek) ve
 * bulunan başka kökler. Araç panelinin Kelime sekmesi ve uzun basınca açılan
 * kelime sayfası aynı kartı kullanır.
 */

export type DictState =
  | { word: string; status: 'loading' }
  | { word: string; status: 'done'; result: DictResult }
  | { word: string; status: 'none' | 'offline' | 'error' };

/** TDK sonucu: madde, köken, en çok 3 anlam (tür + örnek), başka kökler */
export function DictCard({ state, onLookUp }: { state: DictState; onLookUp: (word: string) => void }) {
  const { theme } = useSettings();
  if (state.status === 'loading') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
        <ActivityIndicator color={theme.colors.accent} />
        <Txt variant="dim">Sözlükte aranıyor…</Txt>
      </View>
    );
  }
  if (state.status !== 'done') {
    return (
      <Txt variant="dim">
        {state.status === 'none'
          ? `"${state.word}" sözlükte bulunamadı. Özel ad ya da çok çekimli bir biçim olabilir.`
          : state.status === 'offline'
            ? 'Sözlüğe ulaşılamadı. İnternet bağlantını kontrol et; daha önce bakılan kelimeler çevrimdışı da açılır.'
            : 'Sözlük yanıtı okunamadı.'}
      </Txt>
    );
  }
  const { result } = state;
  return (
    <Card style={{ gap: theme.space(2) }}>
      {result.entries.map((entry, entryIndex) => (
        <View key={`${entry.word}-${entryIndex}`} style={{ gap: theme.space(1) }}>
          <Txt variant="body" style={{ fontSize: 17, ...fontStyle(theme, '700') }}>
            {entry.word}
            {entry.origin ? (
              <Text style={{ color: theme.colors.textDim, fontSize: 13, ...fontStyle(theme, '400') }}>
                {'  '}
                {entry.origin}
              </Text>
            ) : null}
          </Txt>
          {entry.meanings.map((meaning, index) => (
            <View key={index}>
              <Txt variant="body" style={{ fontSize: 14 }}>
                {index + 1}.{' '}
                {meaning.tags.length ? (
                  <Text style={{ color: theme.colors.accent }}>{meaning.tags.join(', ')} · </Text>
                ) : null}
                {meaning.text}
              </Txt>
              {meaning.example ? (
                <Txt variant="dim" style={{ fontSize: 13, fontStyle: 'italic' }}>
                  “{meaning.example}”
                </Txt>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      {result.query !== result.entries[0]?.word ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          "{result.query}" biçiminin kökü olarak bulundu.
        </Txt>
      ) : null}
      {result.alternatives.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space(2) }}>
          <Txt variant="dim" style={{ fontSize: 12 }}>
            Başka kök:
          </Txt>
          {result.alternatives.map((word) => (
            <Chip key={word} label={word} active={false} onPress={() => onLookUp(word)} />
          ))}
        </View>
      ) : null}
      <Txt variant="dim" style={{ fontSize: 11 }}>
        Kaynak: TDK Güncel Türkçe Sözlük (sozluk.gov.tr)
      </Txt>
    </Card>
  );
}
