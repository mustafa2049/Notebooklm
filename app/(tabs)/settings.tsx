import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import type { ReaderMode } from '@/core/types';
import { formatClock } from '@/habit/goal';
import { REMINDER_SUPPORTED } from '@/habit/reminder';
import { useSettings } from '@/store/SettingsContext';
import { KEYS } from '@/storage/keys';
import type { ThemePreference } from '@/storage/settings';
import { AiSettings } from '@/ui/AiSettings';
import { Slider } from '@/ui/Slider';
import {
  Button,
  Card,
  Chip,
  Divider,
  Field,
  Screen,
  SectionHeader,
  Toggle,
  Txt,
} from '@/ui/primitives';

const MODE_LABEL: Record<ReaderMode, string> = {
  rsvp: 'Kelime akışı',
  chunk: 'Parça parça',
  bionic: 'Bionic',
  highlight: 'Yürüyen vurgu',
};

const THEME_LABEL: Record<ThemePreference, string> = {
  dark: 'Koyu',
  light: 'Açık',
  system: 'Sistem',
};

export default function SettingsScreen() {
  const { theme, settings, update } = useSettings();
  const [cleared, setCleared] = useState(false);

  return (
    <Screen>
      <Txt variant="title">Ayarlar</Txt>

      <SectionHeader title="Okuma" />
      <Card style={{ gap: theme.space(1) }}>
        <Slider
          value={settings.wpm}
          min={100}
          max={1200}
          step={25}
          onChange={(wpm) => update({ wpm })}
          label="Hedef hız"
          format={(wpm) => `${wpm} kelime/dk`}
        />

        <Txt variant="body" style={{ marginTop: theme.space(2) }}>
          Varsayılan mod
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2), marginTop: theme.space(2) }}>
          {(Object.keys(MODE_LABEL) as ReaderMode[]).map((mode) => (
            <Chip
              key={mode}
              label={MODE_LABEL[mode]}
              active={settings.mode === mode}
              onPress={() =>
                update({ mode, ...(mode === 'chunk' ? { chunkSize: 3 } : mode === 'rsvp' ? { chunkSize: 1 } : {}) })
              }
            />
          ))}
        </View>

        <Txt variant="body" style={{ marginTop: theme.space(4) }}>
          Bir karede kelime sayısı
        </Txt>
        <Txt variant="dim" style={{ fontSize: 13, marginTop: 2 }}>
          Grup büyüdükçe çevresel görüş devreye girer; 3–4 kelime alışmak için zaman ister.
        </Txt>
        <View style={{ flexDirection: 'row', gap: theme.space(2), marginTop: theme.space(2) }}>
          {[1, 2, 3, 4].map((size) => (
            <Chip
              key={size}
              label={`${size}`}
              active={settings.chunkSize === size}
              onPress={() => update({ chunkSize: size })}
            />
          ))}
        </View>

        <Divider />
        <Toggle
          label="Noktalamada duraksama"
          hint="Virgül, cümle ve paragraf sonlarında kareye ek süre verir."
          value={settings.useMultipliers}
          onChange={(useMultipliers) => update({ useMultipliers })}
        />
        <Divider />
        <Toggle
          label="Yumuşak başlangıç"
          hint="Duraklattıktan sonra ilk kelimeler biraz daha uzun kalır."
          value={settings.rampUp}
          onChange={(rampUp) => update({ rampUp })}
        />
        <Divider />
        <Toggle
          label="Uzun kelimeleri böl"
          hint="14 harften uzun kelimeler hece sınırından ikiye ayrılıp iki karede gösterilir."
          value={settings.splitLongWords}
          onChange={(splitLongWords) => update({ splitLongWords })}
        />
      </Card>

      <SectionHeader title="Görünüm" />
      <Card style={{ gap: theme.space(1) }}>
        <Txt variant="body">Tema</Txt>
        <View style={{ flexDirection: 'row', gap: theme.space(2), marginTop: theme.space(2) }}>
          {(Object.keys(THEME_LABEL) as ThemePreference[]).map((option) => (
            <Chip
              key={option}
              label={THEME_LABEL[option]}
              active={settings.theme === option}
              onPress={() => update({ theme: option })}
            />
          ))}
        </View>

        <Slider
          value={settings.fontScale}
          min={0.7}
          max={1.6}
          step={0.1}
          onChange={(fontScale) => update({ fontScale })}
          label="Yazı boyutu"
          format={(scale) => `${Math.round(scale * 100)}%`}
        />

        <Slider
          value={settings.bionicRatio}
          min={0.2}
          max={0.6}
          step={0.05}
          onChange={(bionicRatio) => update({ bionicRatio })}
          label="Bionic kalın oranı"
          format={(ratio) => `${Math.round(ratio * 100)}%`}
        />

        <Divider />
        <Toggle
          label="Disleksi dostu font"
          hint="Atkinson Hyperlegible — harfleri birbirinden ayırt etmesi kolay."
          value={settings.hyperlegible}
          onChange={(hyperlegible) => update({ hyperlegible })}
        />
        <Divider />
        <Toggle
          label="Pivot kılavuzu"
          hint="Kelime akışı modunda sabitlenme noktasını gösteren çizgiler."
          value={settings.showPivotGuides}
          onChange={(showPivotGuides) => update({ showPivotGuides })}
        />
        <Divider />
        <Toggle
          label="Çevreyi soldur"
          hint="Yürüyen vurgu modunda okunmayan metni soluklaştırır."
          value={settings.dimSurrounding}
          onChange={(dimSurrounding) => update({ dimSurrounding })}
        />
        {Platform.OS !== 'web' ? (
          <>
            <Divider />
            <Toggle
              label="Titreşimli geri bildirim"
              value={settings.haptics}
              onChange={(haptics) => update({ haptics })}
            />
          </>
        ) : null}
      </Card>

      <SectionHeader
        title="Alışkanlık"
        hint="Günlük hedef, seriyi anlamlı kılan şey: gün kapanabilir olsun. Hedefi sıfıra çekersen kart hiç görünmez."
      />
      <Card style={{ gap: theme.space(1) }}>
        <Slider
          value={settings.dailyGoalWords}
          min={0}
          max={20000}
          step={250}
          onChange={(dailyGoalWords) => update({ dailyGoalWords })}
          label="Günlük hedef"
          format={(words) => (words === 0 ? 'hedef yok' : `${words} kelime`)}
        />
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {settings.dailyGoalWords === 0
            ? 'Hedef kapalı: kütüphanede günlük kart görünmüyor.'
            : `Hedef hızında (${settings.wpm} kelime/dk) yaklaşık ${Math.max(
                1,
                Math.round(settings.dailyGoalWords / settings.wpm)
              )} dakika.`}
        </Txt>

        <Divider />
        {REMINDER_SUPPORTED ? (
          <>
            <Toggle
              label="Günlük hatırlatıcı"
              hint={`Her gün ${formatClock(settings.reminderHour, settings.reminderMinute)} saatinde bildirim gönderilir. İzin vermezsen bildirim gönderilmez.`}
              value={settings.reminderEnabled}
              onChange={(reminderEnabled) => update({ reminderEnabled })}
            />
            {settings.reminderEnabled ? (
              <>
                <Slider
                  value={settings.reminderHour}
                  min={0}
                  max={23}
                  step={1}
                  onChange={(reminderHour) => update({ reminderHour })}
                  label="Saat"
                  format={(hour) => formatClock(hour, settings.reminderMinute)}
                />
                <Slider
                  value={settings.reminderMinute}
                  min={0}
                  max={45}
                  step={15}
                  onChange={(reminderMinute) => update({ reminderMinute })}
                  label="Dakika"
                  format={(minute) => formatClock(settings.reminderHour, minute)}
                />
              </>
            ) : null}
          </>
        ) : (
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Hatırlatıcı yalnızca telefon uygulamasında çalışıyor. Tarayıcıda zamanlanmış
            bildirim için sunucu tarafı gerekiyor; bu uygulama her şeyi cihazda tuttuğu için
            web sürümünde bildirim yok.
          </Txt>
        )}
      </Card>

      <SectionHeader
        title="Bağlantıdan okuma"
        hint="Tarayıcılar başka sitelere doğrudan istek atmayı engeller (CORS). Web sürümünde sayfalar bu vekil sunucu üzerinden çekilir; telefonda doğrudan indirildiği için bu alan kullanılmaz."
      />
      <Card>
        <Field
          value={settings.urlProxy}
          onChangeText={(urlProxy) => update({ urlProxy })}
          placeholder="https://r.jina.ai/"
        />
      </Card>

      <AiSettings />

      <SectionHeader title="Veriler" />
      <Card style={{ gap: theme.space(3) }}>
        <Txt variant="dim">
          Tüm metinler, ilerlemeler ve istatistikler yalnızca bu cihazda tutulur; hiçbir
          sunucuya gönderilmez.
        </Txt>
        <Button
          label={cleared ? 'İstatistikler silindi' : 'İstatistikleri sıfırla'}
          variant="danger"
          icon="trash"
          onPress={async () => {
            await AsyncStorage.removeItem(KEYS.sessions);
            setCleared(true);
          }}
        />
      </Card>
    </Screen>
  );
}
