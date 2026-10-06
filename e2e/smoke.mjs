// Uçtan uca duman testi: tüm ana ekranları mobil görünümde gezer ve ekran görüntüsü alır.
// Kullanım: npm run build && npx vite preview --port 4173 & node e2e/smoke.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.SHOTS || 'screenshots';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, locale: 'tr-TR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const click = (text) => page.getByRole('button', { name: text }).first().click();
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(BASE);
await page.getByText('Önemli bilgilendirme').waitFor();
await shot('01-welcome');
await click('Okudum, anladım');
await page.getByPlaceholder('Örn. Mustafa').fill('Mustafa');
await shot('02-profile');
await click('Devam');
await click('Sol göz');
await click('Devam');
await click('2 sa');
await click('Başla');
await page.getByText('Bugünkü kapama').waitFor();
await shot('03-home');

// Zamanlayıcı
await page.getByRole('link', { name: /Kapama/ }).click();
await click(/Bandı taktım/);
await wait(2200);
await shot('04-timer-running');
await click(/Bandı çıkardım/);
await wait(300);

// Egzersiz merkezi
await page.getByRole('link', { name: /Egzersiz/ }).last().click();
await page.getByRole('heading', { name: 'Egzersizler' }).waitFor();
await shot('05-play-hub');

// Tek göz oyunları
for (const kind of ['odd-one-out', 'catch', 'dots', 'tumbling-e']) {
  await page.goto(`${BASE}#/play/exercise/${kind}`);
  await click('Başla');
  await wait(800);
  for (let i = 0; i < 6; i++) await page.mouse.click(120 + i * 30, 300 + i * 40);
  if (kind === 'tumbling-e') for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight']) await page.keyboard.press(k);
  await wait(500);
  await shot(`06-exercise-${kind}`);
  await click('Duraklat ya da çık');
  await click('Bitir ve kaydet');
  await page.getByText('Bitti!').waitFor();
  if (kind === 'odd-one-out') await shot('07-exercise-result');
}

// Kalibrasyon
await page.goto(`${BASE}#/calibrate`);
await shot('08-calibrate-1');
await click('Devam');
await shot('09-calibrate-2');
await click('Devam');
await click('Devam');
await shot('10-calibrate-4');
await click('Kaydet');

// Dikoptik oyunlar
for (const kind of ['blocks', 'breakout', 'stars']) {
  await page.goto(`${BASE}#/play/dichoptic/${kind}`);
  await click('Başla');
  await wait(1500);
  if (kind === 'blocks') for (const k of ['ArrowLeft', 'ArrowUp', ' ']) await page.keyboard.press(k);
  await page.mouse.move(200, 600);
  await wait(800);
  await shot(`11-dichoptic-${kind}`);
  await click('Duraklat ya da çık');
  await click('Bitir ve kaydet');
  await page.getByText('Bitti!').waitFor();
}

// Gabor: rastgele cevaplarla seans bitene kadar
await page.goto(`${BASE}#/play/gabor`);
await shot('12-gabor-setup');
await click('Başla');
await wait(900);
await shot('13-gabor-trial');
for (let i = 0; i < 90; i++) {
  if (await page.getByText('Seans tamam').isVisible()) break;
  await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
  await wait(1250);
}
await page.getByText('Seans tamam').waitFor({ timeout: 15000 });
await shot('14-gabor-result');

// İstatistik, rozetler, ayarlar
await page.goto(`${BASE}#/stats`);
await page.getByRole('heading', { name: 'İlerleme' }).waitFor();
await shot('15-stats');
await page.goto(`${BASE}#/settings`);
await shot('16-settings');
await click('🧒 Çocuk');
await page.goto(`${BASE}#/`);
await wait(300);
await shot('17-home-child');
await page.goto(`${BASE}#/badges`);
await shot('18-badges');

// Veriler sayfa yenilemeden sonra da duruyor mu?
await page.reload();
await page.goto(`${BASE}#/stats`);
await page.getByText('Oyunlar', { exact: true }).waitFor();
const rows = await page.locator('tbody tr').count();
if (rows < 7) errors.push(`Beklenen 7 oyun satırı, bulunan ${rows}`);

// Service worker kaydı
const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
if (!sw) errors.push('Service worker kayıtlı değil');

await browser.close();
if (errors.length) {
  console.error('HATALAR:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Duman testi başarılı, ekran görüntüleri:', OUT);
