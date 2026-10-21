/**
 * Vikisözlük (tr.wiktionary.org) sayfalarından Türkçe tanımlar — saf, testli.
 *
 * Sayfanın `==Türkçe==` bölümünde tür başlıkları (`===Ad===`, `===Eylem===`
 * …; birden çok kökende `====Ad====`) ve `#` ile başlayan tanım satırları var
 * (`#*`, `#:` örnek cümle, alınmıyor). Satırlardaki kalıplar okunur metne
 * çevrilir: alan etiketleri ("{{t|dil=tr|ruh bilimi}}") anlamın etiketi olur,
 * "yanlış yazım" gibi yönlendirmeler "doğrusu: …" olur, köken ve kaynak
 * kalıpları atılır. Yalnızca çekim gösteren satırlar ("{{çekim|…}}",
 * "{{tr-ünlü-çekimi}}") alınmaz: uygulama çekimli kelimeyi kökünden buluyor
 * (`stemCandidates`).
 */

/** Tanım alınan tür başlıkları → uygulamada gösterilen tür adı */
export const PARTS_OF_SPEECH = {
  Ad: 'isim',
  İsim: 'isim',
  Eylem: 'fiil',
  Fiil: 'fiil',
  'Ön ad': 'sıfat',
  Sıfat: 'sıfat',
  Belirteç: 'zarf',
  Zarf: 'zarf',
  Ünlem: 'ünlem',
  Bağlaç: 'bağlaç',
  Edat: 'edat',
  İlgeç: 'edat',
  Adıl: 'zamir',
  Zamir: 'zamir',
  Deyim: 'deyim',
  Atasözü: 'atasözü',
  Sayı: 'sayı',
  'Son ek': 'ek',
  'Ön ek': 'ek',
};

/** Yalnızca çekim/biçim gösteren kalıplar: satır alınmaz */
const FORM_OF = new Set([
  'tr-ünlü-çekimi',
  'tr-ma/me-çekim',
  'çekim',
  'hâl',
  'tr-çekim',
  'tr-çekim:m1',
  'ad-hâl',
  'eylem-hâl',
  'mastarı',
  'çoğul ad',
  'çoğul isim',
  'çoğulu',
  'fiil',
  'mçekim',
]);

/** Atılan kalıplar (köken, kaynak, görsel…) */
const DROP = new Set(['k', 'köken', 'kökenli', 'ç', 'IPA', 'ISO', 'proje bağlantısı', 'Dergi kaynağı', 'Web kaynağı', 'Kitap kaynağı', 'kitap kaynağı', 'tanıklık', 'kt', 'mt', 'örnek']);

/** Anlamın etiketi olan kalıplar ("(mecaz)", "(ruh bilimi)") */
const LABELS = new Set(['t', 'terim', 'Terim', 'mecaz', 'özel ad', 'renk', 'deyimsel', 'kısa', 'eskimiş yazım']);

/** Sayfanın Türkçe bölümü (yoksa null) */
export function turkishSection(wikitext) {
  const lines = wikitext.split('\n');
  const start = lines.findIndex((line) => /^==\s*Türkçe\s*==\s*$/.test(line));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^==[^=].*==\s*$/.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** Kalıbın parametreleri: konumlular ve adlılar (`dil=tr`) */
function parameters(inner) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '[[' || two === '{{') {
      depth++;
      current += two;
      i++;
      continue;
    }
    if (two === ']]' || two === '}}') {
      depth--;
      current += two;
      i++;
      continue;
    }
    if (inner[i] === '|' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += inner[i];
  }
  parts.push(current);
  const name = parts.shift()?.trim() ?? '';
  const positional = [];
  const named = {};
  for (const part of parts) {
    const eq = /^\s*([^=[\]{}]+?)\s*=(.*)$/s.exec(part);
    if (eq) named[eq[1]] = eq[2].trim();
    else positional.push(part.trim());
  }
  return { name, positional, named };
}

/** İlk konumlu değeri dil kodu olan kalıplar ("{{yanlış yazım|tr|…}}", "{{b|tr|…}}") */
const LANGUAGE_FIRST = new Set(['yanlış yazım', 'imla hatası', 'b', 'mecaz', 'alternatif', 'farklı', 'eş anlamlı', 'eş anlamlılar']);

/** Satırdaki bir kalıbın okunur karşılığı; `labels` etiketleri toplar */
function renderTemplate(inner, labels) {
  const { name, positional, named } = parameters(inner);
  let values = positional.filter((value) => value && value !== 'tr');
  // "din", "ses" gibi kısa etiketler dil kodu sanılmasın: yalnızca dil koduyla başlayan kalıplarda
  if (LANGUAGE_FIRST.has(name) && values.length > 1 && /^[a-z]{2,3}$/.test(values[0]) && positional[0] === values[0]) {
    values = values.slice(1);
  }
  if (FORM_OF.has(name) || DROP.has(name)) return '';
  if (LABELS.has(name)) {
    if (name === 'mecaz') labels.push('mecaz');
    else labels.push(...values.map(inline));
    return '';
  }
  switch (name) {
    case 'ağız':
      if (values[0]) labels.push(`${inline(values[0])} ağzı`);
      else labels.push('ağız');
      return '';
    case 'belirtici':
    case 'şerh':
      return values[0] ? `(${inline(values[0])})` : '';
    case 'şot':
    case 'mânâ':
      return values[0] ? `${inline(values[0])}${name === 'mânâ' ? ':' : ''}` : '';
    case 'yanlış yazım':
    case 'imla hatası':
      return values[0] ? `doğrusu: ${inline(values[0])}` : '';
    case 'farklı':
    case 'alternatif':
    case 'farklı yazılışlar':
      return values[0] ? `bkz. ${inline(values[0])}` : '';
    case 'eş anlamlı':
    case 'eş anlamlılar':
      return values.length ? `eş anlamlısı: ${values.map(inline).join(', ')}` : '';
    case 'kısaltma':
      return values[0] ? `${inline(values[0])} (kısaltma)` : '';
    case 'b':
    case 'l':
    case 'z':
    case 'w':
    case 'a':
      // Bağlantı kalıpları: gösterilen metin son değer
      return values.length ? inline(values[values.length - 1]) : named.metin ?? '';
    default:
      return '';
  }
}

/** Satır içi temizlik: bağlantılar, kalın/italik, HTML, kaynaklar */
export function inline(text) {
  return text
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:File|Dosya|Resim|Image|Kategori|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bir tanım satırı → { text, labels } ya da null (alınmayacaksa) */
export function parseDefinition(line) {
  const body = line.replace(/^#+\s*/, '');
  const labels = [];
  let text = '';
  let rest = body;
  // Kalıpları içten dışa değil, soldan sağa: iç içe kalıpları `parameters` taşıyor
  while (rest.length) {
    const open = rest.indexOf('{{');
    if (open < 0) {
      text += rest;
      break;
    }
    text += rest.slice(0, open);
    let depth = 0;
    let close = -1;
    for (let i = open; i < rest.length - 1; i++) {
      if (rest[i] === '{' && rest[i + 1] === '{') {
        depth++;
        i++;
      } else if (rest[i] === '}' && rest[i + 1] === '}') {
        depth--;
        i++;
        if (depth === 0) {
          close = i + 1;
          break;
        }
      }
    }
    if (close < 0) break;
    const inner = rest.slice(open + 2, close - 2);
    const { name } = parameters(inner);
    if (FORM_OF.has(name)) return null;
    text += renderTemplate(inner, labels);
    rest = rest.slice(close);
  }
  const clean = inline(text)
    .replace(/^[\s;,.:–-]+/, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[\s;,]+$/, '')
    .trim();
  if (clean.length < 2) return null;
  return { text: clean.length > 400 ? `${clean.slice(0, 397).trimEnd()}…` : clean, labels: labels.filter(Boolean) };
}

/** Bölümün tanımları tür tür: [{ pos, meanings: [{ text, labels }] }] */
export function parseSection(section, maxMeanings = 8) {
  const entries = [];
  let current = null;
  for (const line of section.split('\n')) {
    const heading = /^===+\s*([^=]+?)\s*===+\s*$/.exec(line);
    if (heading) {
      const pos = PARTS_OF_SPEECH[heading[1].replace(/\s+\d+$/, '')];
      current = pos ? { pos, meanings: [] } : null;
      if (current) entries.push(current);
      continue;
    }
    if (!current || !/^#(?![*:#])/.test(line)) continue;
    if (current.meanings.length >= maxMeanings) continue;
    const meaning = parseDefinition(line);
    if (meaning && !current.meanings.some((item) => item.text === meaning.text)) current.meanings.push(meaning);
  }
  return entries.filter((entry) => entry.meanings.length > 0);
}

/** Sözlüğe alınacak madde başı mı: tek kelime, küçük harfle başlayan (özel ad ve kısaltma değil) */
export function acceptTitle(title) {
  return /^[a-zçğıöşüâîû][a-zçğıöşüâîû'-]*$/.test(title);
}

/** Satır biçimi: `kelime\ttür\tanlam␟anlam`; anlamdaki etiketler `[etiket, etiket] metin` */
export const SEPARATOR = '\u001f';

export function formatEntry(word, entry) {
  const meanings = entry.meanings.map(({ text, labels }) => {
    // Madde başını tekrarlayan etiket ("kitap" maddesinde "[kitap]") bilgi taşımıyor
    const shown = [...new Set(labels.filter((label) => label && label !== word))];
    return (shown.length ? `[${shown.join(', ')}] ${text}` : text).replace(/[\t\n\u001f]/g, ' ');
  });
  return `${word}\t${entry.pos}\t${meanings.join(SEPARATOR)}`;
}

/** Dilim adı (dosya adı ASCII): ilk harfe göre */
export function shardOf(word) {
  const first = word[0];
  const map = { ç: 'c2', ğ: 'g2', ı: 'i2', ö: 'o2', ş: 's2', ü: 'u2', â: 'a', î: 'i', û: 'u' };
  if (map[first]) return map[first];
  return /^[a-z]$/.test(first) ? first : 'diger';
}
