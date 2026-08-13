import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { createProvider, isAiConfigured, pricesFrom, providerDefaults } from '@/ai';
import { formatCost, formatTokens, type UsageTotals } from '@/ai/cost';
import { AiError } from '@/ai/types';
import type { AiProviderKind } from '@/ai/types';
import { useSettings } from '@/store/SettingsContext';
import { loadUsageTotals, recordUsage, resetUsageTotals } from '@/storage/ai';
import { Button, Card, Chip, Divider, Field, SectionHeader, Txt } from './primitives';

/**
 * Ayarlar ekranının yapay zekâ bölümü.
 *
 * Üç şeyi aynı yerde tutuyor: sağlayıcı yapılandırması, **anahtarın nerede
 * durduğuna dair dürüst uyarı** ve harcama sayacı. AI tamamen isteğe bağlı;
 * burada hiçbir şey girilmezse uygulama bugünkü gibi çalışıyor.
 */

const PROVIDER_LABEL: Record<AiProviderKind, string> = {
  anthropic: 'Claude',
  'openai-compatible': 'OpenAI uyumlu',
};

const PROVIDER_HINT: Record<AiProviderKind, string> = {
  anthropic: 'Anthropic’in Claude modelleri. Anahtarı console.anthropic.com üzerinden alınır.',
  'openai-compatible':
    'OpenAI biçimini konuşan her servis: OpenAI, Gemini uyumluluk adresi, OpenRouter, Groq, ' +
    'DeepSeek ve bilgisayarında çalışan yerel modeller (Ollama, LM Studio). Adres ve model adını sen verirsin.',
};

type TestState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; model: string; tokens: number }
  | { kind: 'fail'; message: string };

export function AiSettings() {
  const { theme, settings, update } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [totals, setTotals] = useState<UsageTotals | null>(null);

  useEffect(() => {
    loadUsageTotals().then(setTotals);
  }, []);

  const defaults = providerDefaults(settings.aiProvider);
  const configured = isAiConfigured(settings);

  const runTest = async () => {
    setTest({ kind: 'running' });
    try {
      const provider = createProvider(settings);
      // Küçük ve ucuz bir istek: bağlantı, anahtar ve model adını birlikte sınar
      const response = await provider.complete({
        system: 'Kısa yanıt ver.',
        prompt: 'Yalnızca "tamam" yaz.',
        maxTokens: 64,
      });
      const used = response.usage.inputTokens + response.usage.outputTokens;
      setTotals(await recordUsage(response.usage, pricesFrom(settings)));
      setTest({ kind: 'ok', model: response.model, tokens: used });
    } catch (caught) {
      setTest({
        kind: 'fail',
        message: caught instanceof AiError ? caught.message : 'Beklenmeyen bir hata oluştu.',
      });
    }
  };

  return (
    <>
      <SectionHeader
        title="Yapay zekâ"
        hint="İsteğe bağlı. Özet, anlama soruları, kelime açıklaması ve metinle sohbet için kullanılır; boş bırakırsan uygulama bunlar olmadan tam çalışır."
      />
      <Card style={{ gap: theme.space(4) }}>
        <View style={{ gap: theme.space(2) }}>
          <Txt variant="body">Sağlayıcı</Txt>
          <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
            {(Object.keys(PROVIDER_LABEL) as AiProviderKind[]).map((kind) => (
              <Chip
                key={kind}
                label={PROVIDER_LABEL[kind]}
                active={settings.aiProvider === kind}
                onPress={() => {
                  update({ aiProvider: kind });
                  setTest({ kind: 'idle' });
                }}
              />
            ))}
          </View>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {PROVIDER_HINT[settings.aiProvider]}
          </Txt>
        </View>

        <Field
          label="API anahtarı"
          value={settings.aiApiKey}
          onChangeText={(aiApiKey) => {
            update({ aiApiKey });
            setTest({ kind: 'idle' });
          }}
          placeholder={settings.aiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
          secure={!showKey}
          right={
            <Pressable onPress={() => setShowKey((v) => !v)} hitSlop={8}>
              <Txt variant="dim" style={{ fontSize: 13 }}>
                {showKey ? 'gizle' : 'göster'}
              </Txt>
            </Pressable>
          }
        />

        <Field
          label="Model"
          hint={
            settings.aiProvider === 'anthropic'
              ? `Boş bırakırsan ${defaults.model} kullanılır. Daha güçlü bir model yazabilirsin (örn. claude-sonnet-5).`
              : 'Zorunlu. Örnek: gpt-5, gemini-2.5-flash, llama3.'
          }
          value={settings.aiModel}
          onChangeText={(aiModel) => {
            update({ aiModel });
            setTest({ kind: 'idle' });
          }}
          placeholder={defaults.model || 'model adı'}
        />

        <Field
          label="Sunucu adresi"
          hint={`Boş bırakırsan ${defaults.baseUrl} kullanılır. Yerel model için örnek: http://localhost:11434/v1`}
          value={settings.aiBaseUrl}
          onChangeText={(aiBaseUrl) => {
            update({ aiBaseUrl });
            setTest({ kind: 'idle' });
          }}
          placeholder={defaults.baseUrl}
        />

        <Divider />

        <View style={{ gap: theme.space(2) }}>
          <Txt variant="body">Fiyat (1 milyon token başına, dolar)</Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Sağlayıcının fiyat sayfasından girersen harcama tahmini gösterilir. Boş bırakırsan
            yalnızca token sayısı görünür — uydurma bir tutar gösterilmez.
          </Txt>
          <View style={{ flexDirection: 'row', gap: theme.space(3) }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Girdi"
                value={settings.aiInputPrice ? String(settings.aiInputPrice) : ''}
                onChangeText={(text) => update({ aiInputPrice: parsePrice(text) })}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Çıktı"
                value={settings.aiOutputPrice ? String(settings.aiOutputPrice) : ''}
                onChangeText={(text) => update({ aiOutputPrice: parsePrice(text) })}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <Divider />

        <Button
          label={test.kind === 'running' ? 'Deneniyor…' : 'Bağlantıyı test et'}
          icon="sparkle"
          variant="secondary"
          disabled={!configured || test.kind === 'running'}
          onPress={runTest}
        />
        {!configured ? (
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {settings.aiProvider === 'anthropic'
              ? 'Test için API anahtarı gerekiyor.'
              : 'Test için model adı ve (yerel model değilse) anahtar gerekiyor.'}
          </Txt>
        ) : null}
        {test.kind === 'ok' ? (
          <Txt variant="body" style={{ color: theme.colors.success, fontSize: 13 }}>
            Çalışıyor. Yanıtı veren model: {test.model} · {test.tokens} token harcandı.
          </Txt>
        ) : null}
        {test.kind === 'fail' ? (
          <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
            {test.message}
          </Txt>
        ) : null}

        <Divider />

        <View style={{ gap: theme.space(1.5) }}>
          <Txt variant="body">Harcama</Txt>
          {totals && totals.calls > 0 ? (
            <>
              <Txt variant="dim" style={{ fontSize: 13 }}>
                {totals.calls} çağrı · {formatTokens(totals.inputTokens)} girdi ·{' '}
                {formatTokens(totals.outputTokens)} çıktı
                {formatCost(settings.aiInputPrice || settings.aiOutputPrice ? totals.costUsd : null)
                  ? ` · yaklaşık ${formatCost(totals.costUsd)}`
                  : ''}
              </Txt>
              <Button
                label="Sayacı sıfırla"
                variant="ghost"
                onPress={async () => {
                  await resetUsageTotals();
                  setTotals(await loadUsageTotals());
                }}
              />
            </>
          ) : (
            <Txt variant="dim" style={{ fontSize: 13 }}>
              Henüz AI çağrısı yapılmadı.
            </Txt>
          )}
        </View>

        <Divider />

        <Txt variant="dim" style={{ fontSize: 13 }}>
          Anahtar yalnızca bu cihazda saklanır ve senin seçtiğin sağlayıcı dışında hiçbir yere
          gönderilmez. Tarayıcıda çalışıyorsan bu tarayıcı profiline erişen biri anahtarı
          okuyabilir — ortak bilgisayarda kullanmamak iyi olur. Metnin AI’a gönderilen bölümü
          sağlayıcının sunucusuna gider; bu yüzden özel metinlerde önce sağlayıcının veri
          politikasına bakmak gerekir.
        </Txt>
      </Card>
    </>
  );
}

/** Virgüllü girişi de kabul eder; sayı değilse 0 (yani "fiyat bilinmiyor"). */
function parsePrice(text: string): number {
  const value = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
