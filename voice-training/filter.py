"""Üretilen kayıtları denetler, eğitim listesini yazar.

Her kayıt Whisper ile yazıya dökülür; metinden çok sapanlar (klon sesin
yanlış okuduğu, takıldığı ya da kelime atladığı cümleler) eğitime alınmaz.
Çok kısa ya da çok uzun kayıtlar da atlanır. Sonuç piper'ın "fonem metni"
biçiminde: `c0001.wav|fonemler`.

Kullanım:
  python filter.py --corpus corpus.tsv --wavs wavs --out metadata.csv [--max-cer 0.12]

Yazıya dökümler wavs/transcripts.json'a kaydedilir: yeniden çalıştırmak hızlı.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import char_error_rate, read_corpus  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--wavs", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-cer", type=float, default=0.12)
    parser.add_argument("--model", default="small", help="Whisper modeli (small Türkçede yeterli)")
    parser.add_argument("--device", default=None)
    args = parser.parse_args()

    import soundfile
    from faster_whisper import WhisperModel

    wavs = Path(args.wavs)
    cache_path = wavs / "transcripts.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    rows = [row for row in read_corpus(args.corpus) if (wavs / f"{row.id}.wav").exists()]
    if not rows:
        sys.exit("Hiç kayıt yok: önce generate.py çalıştırılmalı.")

    device = args.device
    if device is None:
        try:
            import ctranslate2

            device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
        except Exception:
            device = "cpu"
    model = None

    def transcribe(path: Path) -> str:
        """Ekran kartı kütüphaneleri eksik ya da uyuşmazsa işlemciye geçer."""
        nonlocal model, device
        while True:
            try:
                if model is None:
                    model = WhisperModel(args.model, device=device, compute_type="int8_float16" if device == "cuda" else "int8")
                segments, _ = model.transcribe(str(path), language="tr", beam_size=5)
                return " ".join(segment.text.strip() for segment in segments)
            except (RuntimeError, OSError, ValueError) as error:
                if device == "cpu":
                    raise
                print(f"Whisper ekran kartında çalışmadı ({error}); işlemciyle devam.", flush=True)
                device, model = "cpu", None

    kept, dropped = [], []
    for n, row in enumerate(rows, 1):
        path = wavs / f"{row.id}.wav"
        info = soundfile.info(str(path))
        if info.duration < 0.8 or info.duration > 20:
            dropped.append((row, 1.0, f"süre {info.duration:.1f} sn"))
            continue
        if row.id not in cache:
            cache[row.id] = transcribe(path)
            if n % 50 == 0:
                cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
                print(f"{n}/{len(rows)} yazıya döküldü", flush=True)
        cer = char_error_rate(row.text, cache[row.id])
        (kept if cer <= args.max_cer else dropped).append((row, cer, cache[row.id]))
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    Path(args.out).write_text(
        "".join(f"{row.id}.wav|{row.phonemes}\n" for row, _, _ in kept), encoding="utf-8"
    )
    print(f"Eğitime alınan: {len(kept)}, ayıklanan: {len(dropped)} (en çok %{args.max_cer * 100:.0f} karakter hatası)")
    for row, cer, heard in sorted(dropped, key=lambda item: -item[1])[:8]:
        print(f"  {row.id} %{cer * 100:.0f}: {row.text[:50]} → {heard[:50]}")


if __name__ == "__main__":
    main()
