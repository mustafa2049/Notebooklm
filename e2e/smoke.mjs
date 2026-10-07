// Uçtan uca duman testi: tüm ana ekranları mobil görünümde gezer ve ekran görüntüsü alır.
// Kullanım: npm run build && npx vite preview --port 4173 & node e2e/smoke.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.SHOTS || 'screenshots';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  // Sahte kamera: yüz içermeyen test görüntüsü verir (kamera akışının hatasız çalıştığını doğrular)
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, locale: 'tr-TR', acceptDownloads: true };
const ctx = await browser.newContext(ctxOpts);
await ctx.grantPermissions(['camera', 'clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// MediaPipe bilgi satırlarını (ör. "INFO: Created TensorFlow Lite XNNPACK delegate") console.error ile yazar; bunlar hata değil.
const benign = (t) => /^(INFO|I\d{4}|W\d{4})[: ]|TensorFlow Lite|XNNPACK/.test(t);
page.on('console', (m) => m.type() === 'error' && !benign(m.text()) && errors.push(m.text()));

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
await page.getByRole('button', { name: 'Başla', exact: true }).click();

// Kurulum sihirbazı: reçete, doktor planı, ekran ölçeği; gözlük ayarı ve görme testi sonraya kalır
await page.getByRole('heading', { name: /Kurulum/ }).waitFor();
await click('👓 Gözlük kullanıyorum');
for (const [label, v] of [['Sağ SPH', '+2,50'], ['Sağ CYL', '-1,75'], ['Sağ AKS', '5'], ['Sol SPH', '+2,00'], ['Sol CYL', '-1'], ['Sol AKS', '39']]) {
  await page.getByLabel(label, { exact: true }).fill(v);
}
await shot('03a-setup-rx');
await click('Kaydet ve devam et');
await page.getByLabel('Günlük kapama süresi (dakika)').fill('120');
await page.getByPlaceholder(/gün boyu takılacak/).fill('Sol göz günde 2 saat kapatılacak');
await shot('03b-setup-plan');
await click('Planı kaydet');
await page.getByTestId('card-box').waitFor();
await click('Kaydet');
await page.getByRole('link', { name: /Gözlük ayarını yap/ }).waitFor();
await shot('03c-setup-glasses');
await click(/Sonra yaparım/);
await click('Bitir');
await page.getByText('Bugünkü kapama').waitFor();
const setupText = await page.getByTestId('setup-card').innerText();
if (!setupText.includes('4/6')) errors.push(`Kurulum kartı beklenmedik: ${setupText}`);
await page.getByTestId('weekly-card').waitFor();
await page.getByText('Bugünkü kapama').waitFor();
await page.getByText('Bugünkü plan').waitFor();
await page.getByText('Günün sürprizi').waitFor();
await shot('03-home');

// Zamanlayıcı
await page.locator('.bottom-nav').getByRole('link', { name: /Kapama/ }).click();
await click(/Bandı taktım/);
await wait(2200);
await shot('04-timer-running');
await click(/Bandı çıkardım/);
await wait(300);

// Egzersiz merkezi
await page.locator('.bottom-nav').getByRole('link', { name: /Egzersiz/ }).click();
await page.getByRole('heading', { name: 'Egzersizler' }).waitFor();
await shot('05-play-hub');

// Tek göz oyunları
for (const kind of ['odd-one-out', 'balloons', 'catch', 'maze', 'dots', 'tumbling-e']) {
  await page.goto(`${BASE}#/play/exercise/${kind}`);
  if (kind === 'odd-one-out' && !(await page.getByTestId('glasses-hint').isVisible())) errors.push('Oyun girişinde gözlük hatırlatması yok');
  await page.getByRole('button', { name: 'Başla', exact: true }).click();
  await wait(800);
  for (let i = 0; i < 6; i++) await page.mouse.click(120 + i * 30, 300 + i * 40);
  if (kind === 'tumbling-e') for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight']) await page.keyboard.press(k);
  if (kind === 'maze') for (const k of ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(k);
  if (kind === 'balloons') await wait(2500);
  if (kind === 'odd-one-out') {
    // Ses düğmesi açılıp kapanabilmeli
    await click('Sesi kapat');
    await click('Sesi aç');
  }
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
for (const kind of ['blocks', 'breakout', 'stars', 'snake', 'puzzle', 'depth']) {
  await page.goto(`${BASE}#/play/dichoptic/${kind}`);
  await page.getByRole('button', { name: 'Başla', exact: true }).click();
  await wait(1500);
  if (kind === 'blocks') for (const k of ['ArrowLeft', 'ArrowUp', ' ']) await page.keyboard.press(k);
  if (kind === 'snake') for (const k of ['ArrowDown', 'ArrowLeft']) await page.keyboard.press(k);
  if (kind === 'puzzle') for (let i = 0; i < 6; i++) await page.mouse.click(80 + (i % 3) * 110, 250 + Math.floor(i / 3) * 120);
  await page.mouse.move(200, 600);
  await wait(800);
  await shot(`11-dichoptic-${kind}`);
  await click('Duraklat ya da çık');
  await click('Bitir ve kaydet');
  await page.getByText('Bitti!').waitFor();
}

// Dikoptik film: sayfa içinde kısa bir WebM üret ve yükle
await page.goto(`${BASE}#/play/video`);
await page.getByRole('heading', { name: /Dikoptik Film/ }).waitFor();
await shot('19-video-setup');
const webm = await page.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 240;
  const g = c.getContext('2d');
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start(100);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const draw = () => {
      const t = performance.now() - t0;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#000';
      g.fillRect(100 + (t / 20) % 100, 100, 40, 40);
      if (t < 2500) requestAnimationFrame(draw);
      else resolve();
    };
    draw();
  });
  rec.stop();
  await new Promise((r) => (rec.onstop = r));
  const buf = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
  let bin = '';
  buf.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
});
await page.locator('[data-testid=video-file]').setInputFiles({ name: 'test.webm', mimeType: 'video/webm', buffer: Buffer.from(webm, 'base64') });
await wait(600);
if (await page.getByRole('button', { name: 'Oynat' }).isVisible()) await click('Oynat');
await wait(700);
const px = await page.evaluate(() => {
  const gl = document.querySelector('.game-screen canvas');
  const c = document.createElement('canvas');
  c.width = gl.width;
  c.height = gl.height;
  const g = c.getContext('2d');
  g.drawImage(gl, 0, 0);
  return Array.from(g.getImageData(10, 10, 1, 1).data);
});
await shot('20-video-playing');
// Beyaz bölge: tembel göz (sol, kırmızı) tam, sağlam göz (camgöbeği) ~%20
if (!(px[0] > 180 && px[1] > 20 && px[1] < 90 && Math.abs(px[1] - px[2]) < 12)) errors.push(`Dikoptik video pikseli beklenmedik: ${px}`);
await page.getByText('İzleme bitti').waitFor({ timeout: 15000 });

// Gabor: rastgele cevaplarla seans bitene kadar
await page.goto(`${BASE}#/play/gabor`);
await shot('12-gabor-setup');
await page.getByRole('button', { name: 'Başla', exact: true }).click();
await wait(900);
await shot('13-gabor-trial');
for (let i = 0; i < 90; i++) {
  if (await page.getByText('Seans tamam').isVisible()) break;
  await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
  await wait(1250);
}
await page.getByText('Seans tamam').waitFor({ timeout: 15000 });
await shot('14-gabor-result');

// Evde görme testi: ekran ölçeği, sonra tek göz için rastgele cevaplarla sonuca kadar
await page.goto(`${BASE}#/vision?from=setup`);
await click('Yeniden ayarla');
await page.getByRole('heading', { name: /Ekran ölçeği/ }).waitFor();
for (let i = 0; i < 5; i++) await click('Büyüt');
await shot('21-vision-scale');
await click('Kaydet');
await click('Sadece tembel göz');
await shot('22-vision-setup');
await click('Teste başla');
await click('Hazırım');
await wait(300);
await shot('23-vision-test');
for (let i = 0; i < 80; i++) {
  if (await page.getByRole('heading', { name: /Sonuç/ }).isVisible()) break;
  await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][i % 4]);
  await wait(80);
}
await page.getByRole('heading', { name: /Sonuç/ }).waitFor();
await shot('24-vision-result');
await page.getByRole('link', { name: /Kuruluma dön/ }).click();
// Gözlük ayarı yukarıda yapıldı; görme testiyle kurulum tamamlanır
await page.getByTestId('setup-progress').getByText('6/6').waitFor();
await page.getByText('Kurulum tamamlandı').waitFor();
await shot('24b-setup-done');

// Günlük
await page.goto(`${BASE}#/diary`);
await click('Baş ağrısı');
await click('Çoğunlukla');
await page.getByPlaceholder(/bant cildimi/).fill('Test notu');
await click('Kaydet');
await page.getByText('Kaydedildi').waitFor();
await shot('25-diary');

// Dikoptik okuma (kayıt için en az 15 sn)
await page.goto(`${BASE}#/play/reading`);
await click('Okumaya başla');
await page.getByTestId('reading-text').waitFor();
await wait(1000);
await shot('26-reading');
await wait(15500);
await click('Bitirdim');
await page.getByText('Okuma bitti').waitFor();

// 3D (stereo) görme testi: rastgele cevaplarla sonuca kadar; çizimde iki göz rengi de olmalı
await page.goto(`${BASE}#/stereo`);
await click('Teste başla');
await wait(400);
const colours = await page.evaluate(() => {
  const c = document.querySelector('.game-screen canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let red = 0, cyan = 0, white = 0;
  for (let i = 0; i < d.length; i += 4 * 7) {
    if (d[i] > 200 && d[i + 1] < 50) red++;
    else if (d[i] < 50 && d[i + 1] > 200) cyan++;
    else if (d[i] > 200 && d[i + 1] > 200) white++;
  }
  return { red, cyan, white };
});
if (!(colours.red > 100 && colours.cyan > 100 && colours.white > 100)) errors.push(`Stereogram renkleri beklenmedik: ${JSON.stringify(colours)}`);
await shot('28-stereo-test');
for (let i = 0; i < 60; i++) {
  if (await page.getByRole('heading', { name: /Sonuç/ }).isVisible()) break;
  await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][i % 4]);
  await wait(120);
}
await page.getByRole('heading', { name: /Sonuç/ }).waitFor();
await shot('29-stereo-result');

// Kamera ile mesafe: sahte kamerada yüz yok → "Yüz aranıyor" durumu hatasız gösterilmeli
await page.goto(`${BASE}#/settings`);
await click('Kamerayı aç ve mesafeyi gör');
await page.getByText(/Yüz aranıyor|Kamera kullanılamıyor|başlatılamadı/).first().waitFor({ timeout: 60000 });
const camText = await page.getByRole('status').first().innerText();
if (!/Yüz aranıyor/.test(camText)) errors.push(`Kamera durumu beklenmedik: ${camText}`);
await page.getByText('Kamera ile mesafe').first().scrollIntoViewIfNeeded();
await shot('30-camera');
await click('Kamerayı kapat');

// Doktor raporu
await page.goto(`${BASE}#/report`);
await page.getByTestId('report').waitFor();
for (const t of ['Göz tembelliği tedavi özeti', 'Görme keskinliği', 'Test notu', 'Dikoptik Okuma', 'Gözlük reçetesi', '+2,50 / −1,75 × 5°', 'Gözlük takma']) {
  if (!(await page.getByTestId('report').getByText(t).first().isVisible())) errors.push(`Raporda "${t}" yok`);
}
await shot('27-report');

// Rapor bağlantısı: panoya kopyalanır, yeni sekmede profil olmadan açılır
await click('Bağlantı ile paylaş');
await page.getByTestId('link-msg').waitFor();
const link = await page.evaluate(() => navigator.clipboard.readText());
if (!link.includes('#/shared/')) errors.push(`Paylaşım bağlantısı beklenmedik: ${link.slice(0, 80)}`);
const doctorCtx = await browser.newContext(ctxOpts);
const doctor = await doctorCtx.newPage();
doctor.on('pageerror', (e) => errors.push('doktor: ' + e.message));
await doctor.goto(link);
await doctor.getByRole('heading', { name: /Paylaşılan rapor/ }).waitFor();
for (const t of ['Mustafa', 'Görme keskinliği', '3D (stereo)', 'Test notu', '+2,00 / −1,00 × 39°']) {
  if (!(await doctor.getByTestId('report').getByText(t).first().isVisible())) errors.push(`Paylaşılan raporda "${t}" yok`);
}
await doctor.screenshot({ path: `${OUT}/31-shared-report.png` });
await doctorCtx.close();

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
if (rows < 12) errors.push(`Beklenen 12 oyun satırı, bulunan ${rows}`);

// Service worker kaydı
const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
if (!sw) errors.push('Service worker kayıtlı değil');

// Yedek al → yeni cihazda (temiz tarayıcı) ilk açılışta geri yükle
await page.goto(`${BASE}#/settings`);
const [download] = await Promise.all([page.waitForEvent('download'), click('Yedek al / paylaş')]);
const backupPath = `${OUT}/yedek.json`;
await download.saveAs(backupPath);
const newCtx = await browser.newContext(ctxOpts);
const fresh = await newCtx.newPage();
fresh.on('pageerror', (e) => errors.push('yeni cihaz: ' + e.message));
await fresh.goto(BASE);
await fresh.getByText('Önemli bilgilendirme').waitFor();
await fresh.getByTestId('restore-file').setInputFiles(backupPath);
await fresh.getByText(/Mustafa/).first().waitFor();
await fresh.screenshot({ path: `${OUT}/32-restored.png` });
await newCtx.close();

await browser.close();
if (errors.length) {
  console.error('HATALAR:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Duman testi başarılı, ekran görüntüleri:', OUT);
