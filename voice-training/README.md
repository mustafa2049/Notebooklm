# Kendi sesin — eğitim seti

Hızlı Okuma'nın metinleri **senin sesinle**, telefonda **internetsiz** okuması
için küçük bir ses modeli (Piper, ~60 MB) eğitir. Eğitim bir kez yapılır;
sonrası ücretsiz ve internetsiz.

## Kısaca

1. Not defterini Google Colab'da aç:
   [kendi-sesim.ipynb](https://colab.research.google.com/github/mustafa2049/Notebooklm/blob/claude/speed-reading-app-plan-kzot5o/voice-training/kendi-sesim.ipynb)
   (açılmazsa: bu klasördeki `kendi-sesim.ipynb`'yi indir, Colab'da
   *Dosya → Not defteri yükle*).
2. *Çalışma zamanı → Çalışma zamanı türünü değiştir → T4 GPU* seç.
3. Hücreleri sırayla çalıştır: ayarlar ve onay kutusu, 10–30 saniyelik kaydın
   (burada kaydedebilir ya da yükleyebilirsin), sonra üretim, ayıklama, eğitim.
4. Sonunda Google Drive'ında `HizliOkumaSes/paket` klasöründe iki dosya olur:
   `tr_TR-<ad>-medium.onnx` ve `.onnx.json`. İkisini telefona indir,
   Hızlı Okuma → **Ayarlar → Ses → Ses paketi ekle** ile birlikte seç.

Yalnızca kendi sesini ya da sahibinden açık izin aldığın bir sesi kullan.

## Nasıl çalışıyor

| Adım | Dosya | Ne yapar |
|---|---|---|
| Derlem | `corpus.tsv` | 1.300 Türkçe cümle: söylenecek metin (sayılar kelimeyle) ve fonemleri. Türkçenin bütün ses ikililerini (1.043) kapsar; baştan alınan her alt küme de iyi kapsar. |
| Üretim | `generate.py` | Chatterbox Multilingual (açık kaynak, MIT) kaydından yola çıkıp her cümleyi senin sesinle okur. |
| Ayıklama | `filter.py` | Whisper her kaydı yazıya döker; metinden %12'den fazla sapanlar (yanlış okunan, takılan) eğitime alınmaz. |
| Eğitim | `train.py`, `piper_fit.py` | piper1-gpl ile Türkçe dfki modelinden ince ayar: ağırlıklar alınır, ses Türkçeyi baştan öğrenmez. Kaldığı yerden devam eder, son kontrol noktası 10 dakikada bir Drive'a yedeklenir. |
| Paket | `export.py`, `onnx_export.py` | ONNX modeli, yapılandırma (`hizliokuma.phonemizer` sürümüyle), web için zip ve dinlemek için örnek ses. |

**Fonemler neden derlemde hazır?** Uygulama metni sese çevirirken kendi Türkçe
çözümleyicisini kullanır (`src/core/phonemize/`, testli). Eğitim de aynı
çözümleyicinin çıktısıyla yapıldığı için telefondaki okuma, sesin
öğrendiğiyle birebir aynı. Çözümleyici değişirse derlem yeniden üretilir:

```bash
npx tsx scripts/voice/build-corpus.ts 1300
```

Eski sesler çalışmaya devam eder (sürüm sesin yapılandırmasına yazılıyor).

## Süre (ücretsiz Colab, T4)

| Adım | 1.000 cümleyle |
|---|---|
| Araçları kurmak | 5–10 dk (her oturumda) |
| Üretim | ~2 saat (65 dk ses) |
| Ayıklama | 10–20 dk |
| Eğitim, 300 epoch | 2–3 saat |
| Paket | 2 dk |

Colab'ın ücretsiz oturumları birkaç saatte kopabilir; her adım kaldığı yerden
sürer (üretilen kayıtlar ve kontrol noktası Drive'da). Yeni oturumda 1, 2 ve 4.
hücreleri çalıştırıp kaldığın adımdan devam et. Ses 100–200 epoch'tan sonra
sana benzemeye başlar; 10. adımla ara ara dinleyip yeterli bulunca durabilirsin.

Kaggle'ın ücretsiz not defterleri de olur (haftada 30 saat ekran kartı); Drive
yerine `/kaggle/working` kullanılır, kayıt dosya olarak yüklenir.

## Kendi kayıtlarınla (klonlamasız)

Sesinin birebir kendisi olsun istersen cümleleri kendin oku: `corpus.tsv`'deki
kimliklerle (`c0001.wav`, `c0002.wav`…) en az 300 cümle kaydedip Drive'daki
`wavs` klasörüne koy, 5. adımı atla. Ayıklama ve eğitim aynı.

## Kendi bilgisayarında (ekran kartın varsa)

```bash
pip install uv
uv venv --python 3.11 .klon && uv pip install --python .klon/bin/python chatterbox-tts==0.1.7 "setuptools<81"
uv venv --python 3.11 .denetim && uv pip install --python .denetim/bin/python faster-whisper==1.2.1 soundfile
uv venv --python 3.11 .piper && uv pip install --python .piper/bin/python "piper-tts[train]==1.8.0" torch==2.8.0
# piper'ın Cython parçası: kendi-sesim.ipynb'nin 4. hücresindeki gibi derlenir

.klon/bin/python generate.py --corpus corpus.tsv --ref kayit.wav --out wavs --limit 1000
.denetim/bin/python filter.py --corpus corpus.tsv --wavs wavs --out metadata.csv
.piper/bin/python train.py --metadata metadata.csv --wavs wavs --work egitim --base dfki.ckpt --epochs 300
.piper/bin/python export.py --work egitim --name "Benim sesim" --out paket --corpus corpus.tsv
```

`dfki.ckpt`: [rhasspy/piper-checkpoints](https://huggingface.co/datasets/rhasspy/piper-checkpoints/tree/main/tr/tr_TR/dfki/medium).

## Lisanslar

- **Chatterbox** (Resemble AI): MIT. Ürettiği seslerde duyulmayan bir filigran
  (Perth) var; eğitilen Piper modeli onu taşımaz.
- **piper1-gpl**: GPL-3.0 — yalnızca eğitimde kullanılır, uygulamaya girmez.
  Uygulama modeli onnxruntime (MIT) ile çalıştırır.
- **dfki** Türkçe ses verisi ve kontrol noktası: CC BY-NC-SA 4.0. Bundan
  türeyen ses **kişisel, ticari olmayan** kullanım içindir.
- **Whisper / faster-whisper**: MIT.
- Derlem: Vikikaynak'taki telif süresi dolmuş klasikler ve Hızlı Okuma'nın
  kendi metinleri.

## Sorunlar

- **"Ekran kartı yok"**: çalışma zamanı türü T4 GPU olmalı.
- **`CUDA out of memory`** (eğitimde): 9. adımda `BATCH`'i 8 yap.
- **Ses robotik ya da sana benzemiyor**: eğitimi uzat (EPOCH'u artırıp 9.
  adımı yeniden çalıştır) ya da daha temiz, yankısız bir kayıtla 3. adımdan
  başla (önce Drive'daki `wavs` klasörünü sil).
- **Bazı kelimeler yanlış okunuyor**: uygulamanın çözümleyicisinde bir kural
  eksik olabilir; o kelimeyi bildir.
