import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiCompatibleProvider } from './openaiCompatible';
import { summaryRequest } from './prompts';
import { AiError, type AiRequest } from './types';

/**
 * Bağdaştırıcı testleri **ağa çıkmaz**: `fetch` yerine kaydedilmiş yanıtlar
 * konuluyor. Kaydedilmiş gövdeler sağlayıcıların dokümante ettiği biçimde;
 * amaç ayrıştırma, hata çevirisi ve geri çekilme mantığını doğrulamak.
 */

interface Call {
  url: string;
  headers: Record<string, string>;
  body: any;
}

let calls: Call[];

/** Sırayla dönecek yanıtları kuyruğa koyar. */
function stubFetch(responses: { status: number; body: unknown }[]) {
  const queue = [...responses];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: any) => {
      calls.push({
        url,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(init.body as string),
      });
      const next = queue.shift();
      if (!next) throw new Error('beklenmeyen ek istek');
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        text: async () => JSON.stringify(next.body),
      } as unknown as Response;
    })
  );
}

const anthropicOk = {
  model: 'claude-haiku-4-5',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'Metin okuma hızı üzerine.' }],
  usage: { input_tokens: 1200, output_tokens: 90 },
};

const schemaRequest: AiRequest = {
  system: 'sistem',
  prompt: 'istem',
  schema: { name: 'test', schema: { type: 'object' } },
  maxTokens: 1000,
};

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Anthropic bağdaştırıcısı', () => {
  it('metni, token kullanımını ve modeli çıkarır', async () => {
    stubFetch([{ status: 200, body: anthropicOk }]);
    const provider = createAnthropicProvider({ apiKey: 'sk-test' });

    const response = await provider.complete(summaryRequest('Bir metin.'));

    expect(response.text).toBe('Metin okuma hızı üzerine.');
    expect(response.usage).toEqual({ inputTokens: 1200, outputTokens: 90 });
    expect(response.model).toBe('claude-haiku-4-5');
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(calls[0].headers['x-api-key']).toBe('sk-test');
    expect(calls[0].headers['anthropic-version']).toBe('2023-06-01');
  });

  it('tarayıcı başlığını yalnızca tarayıcıda ekler', async () => {
    stubFetch([{ status: 200, body: anthropicOk }]);
    await createAnthropicProvider({ apiKey: 'k', browser: true }).complete(summaryRequest('m'));
    expect(calls[0].headers['anthropic-dangerous-direct-browser-access']).toBe('true');

    calls = [];
    stubFetch([{ status: 200, body: anthropicOk }]);
    await createAnthropicProvider({ apiKey: 'k' }).complete(summaryRequest('m'));
    expect(calls[0].headers['anthropic-dangerous-direct-browser-access']).toBeUndefined();
  });

  it('anahtar yoksa ağa çıkmadan anlaşılır hata verir', async () => {
    stubFetch([]);
    await expect(createAnthropicProvider({ apiKey: '  ' }).complete(summaryRequest('m'))).rejects.toThrow(
      /anahtarı girilmemiş/i
    );
    expect(calls).toHaveLength(0);
  });

  it('şema verildiğinde JSON ayrıştırılır', async () => {
    stubFetch([
      {
        status: 200,
        body: {
          ...anthropicOk,
          content: [{ type: 'text', text: '{"questions":[]}' }],
        },
      },
    ]);
    const response = await createAnthropicProvider({ apiKey: 'k' }).complete(schemaRequest);
    expect(response.json).toEqual({ questions: [] });
    expect(calls[0].body.output_config.format.type).toBe('json_schema');
  });

  it('kod bloğu içinde dönen JSON’u da ayrıştırır', async () => {
    stubFetch([
      {
        status: 200,
        body: { ...anthropicOk, content: [{ type: 'text', text: '```json\n{"a":1}\n```' }] },
      },
    ]);
    const response = await createAnthropicProvider({ apiKey: 'k' }).complete(schemaRequest);
    expect(response.json).toEqual({ a: 1 });
  });

  it('güvenlik reddini içerik okumadan bildirir', async () => {
    stubFetch([
      {
        status: 200,
        body: {
          model: 'm',
          stop_reason: 'refusal',
          stop_details: { category: 'policy' },
          content: [],
          usage: { input_tokens: 10, output_tokens: 0 },
        },
      },
    ]);
    await expect(createAnthropicProvider({ apiKey: 'k' }).complete(summaryRequest('m'))).rejects.toThrow(
      /reddetti/
    );
  });

  it('uzunluk sınırına takılan şemalı yanıtı yarım kabul etmez', async () => {
    stubFetch([
      {
        status: 200,
        body: { ...anthropicOk, stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"a":' }] },
      },
    ]);
    await expect(createAnthropicProvider({ apiKey: 'k' }).complete(schemaRequest)).rejects.toThrow(
      /uzunluk sınırına/
    );
  });

  it('model output_config tanımıyorsa alanı düşürüp yeniden dener', async () => {
    stubFetch([
      { status: 400, body: { error: { message: 'unexpected field: output_config.effort' } } },
      { status: 400, body: { error: { message: 'output_config not supported' } } },
      // Şema düştü; model istemdeki tarife uyup JSON döndürüyor
      { status: 200, body: { ...anthropicOk, content: [{ type: 'text', text: '{"questions":[]}' }] } },
    ]);

    const response = await createAnthropicProvider({ apiKey: 'k' }).complete(schemaRequest);

    expect(response.json).toEqual({ questions: [] });
    expect(calls).toHaveLength(3);
    expect(calls[0].body.output_config.effort).toBe('medium');
    expect(calls[1].body.output_config.effort).toBeUndefined();
    expect(calls[2].body.output_config).toBeUndefined();
  });

  it('model adı yanlış olduğunda hatayı gizlemez', async () => {
    stubFetch([{ status: 400, body: { error: { message: 'model: yokmodel not found' } } }]);
    await expect(
      createAnthropicProvider({ apiKey: 'k', model: 'yokmodel' }).complete(summaryRequest('m'))
    ).rejects.toThrow(/model adı yanlış olabilir/);
    // Alan hatası değil: tek deneme yapılır
    expect(calls).toHaveLength(1);
  });

  it('401’i Türkçe ve eyleme dönük mesaja çevirir', async () => {
    stubFetch([{ status: 401, body: { error: { message: 'invalid x-api-key' } } }]);
    try {
      await createAnthropicProvider({ apiKey: 'yanlış' }).complete(summaryRequest('m'));
      throw new Error('hata beklendi');
    } catch (caught) {
      expect(caught).toBeInstanceOf(AiError);
      expect((caught as AiError).message).toMatch(/anahtarı kabul edilmedi/);
      expect((caught as AiError).retryable).toBe(false);
    }
  });

  it('429’u yeniden denenebilir işaretler', async () => {
    stubFetch([{ status: 429, body: { error: { message: 'rate limit' } } }]);
    try {
      await createAnthropicProvider({ apiKey: 'k' }).complete(summaryRequest('m'));
      throw new Error('hata beklendi');
    } catch (caught) {
      expect((caught as AiError).retryable).toBe(true);
    }
  });
});

describe('OpenAI uyumlu bağdaştırıcı', () => {
  const openAiOk = {
    model: 'gpt-test',
    choices: [{ message: { content: 'Özet metni.' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 800, completion_tokens: 60 },
  };

  it('adresi ve gövdeyi OpenAI biçiminde kurar', async () => {
    stubFetch([{ status: 200, body: openAiOk }]);
    const provider = createOpenAiCompatibleProvider({ apiKey: 'sk-x', model: 'gpt-test' });

    const response = await provider.complete(summaryRequest('Bir metin.'));

    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].headers.authorization).toBe('Bearer sk-x');
    expect(calls[0].body.messages[0].role).toBe('system');
    expect(response.usage).toEqual({ inputTokens: 800, outputTokens: 60 });
    expect(response.model).toBe('gpt-test');
  });

  it('yerel model için anahtar başlığı göndermez ve adresi kullanır', async () => {
    stubFetch([{ status: 200, body: openAiOk }]);
    await createOpenAiCompatibleProvider({
      apiKey: '',
      model: 'llama3',
      baseUrl: 'http://localhost:11434/v1/',
    }).complete(summaryRequest('m'));

    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].headers.authorization).toBeUndefined();
  });

  it('model adı yoksa ağa çıkmadan uyarır', async () => {
    stubFetch([]);
    await expect(
      createOpenAiCompatibleProvider({ apiKey: 'k', model: '  ' }).complete(summaryRequest('m'))
    ).rejects.toThrow(/Model adı/);
    expect(calls).toHaveLength(0);
  });

  it('response_format desteklenmiyorsa alanı düşürüp yeniden dener', async () => {
    stubFetch([
      { status: 400, body: { error: { message: "unknown parameter 'response_format'" } } },
      { status: 200, body: { ...openAiOk, choices: [{ message: { content: '{"a":1}' } }] } },
    ]);

    const response = await createOpenAiCompatibleProvider({
      apiKey: 'k',
      model: 'llama3',
    }).complete(schemaRequest);

    expect(response.json).toEqual({ a: 1 });
    expect(calls[0].body.response_format.json_schema.strict).toBe(true);
    expect(calls[1].body.response_format).toBeUndefined();
  });

  it('boş yanıtı sessizce geçirmez', async () => {
    stubFetch([{ status: 200, body: { ...openAiOk, choices: [{ message: { content: '' } }] } }]);
    await expect(
      createOpenAiCompatibleProvider({ apiKey: 'k', model: 'm' }).complete(summaryRequest('m'))
    ).rejects.toThrow(/boş yanıt/);
  });

  it('geçersiz JSON gövdesini açıkça bildirir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => '<html>hata</html>' }) as any)
    );
    await expect(
      createOpenAiCompatibleProvider({ apiKey: 'k', model: 'm' }).complete(summaryRequest('m'))
    ).rejects.toThrow(/geçerli JSON değil/);
  });
});
