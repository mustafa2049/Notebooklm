"""Derlemdeki cümleleri Chatterbox ile senin sesinle okutur.

Kullanım:
  python generate.py --corpus corpus.tsv --ref kayit.wav --out wavs [--limit 1000]

Kaldığı yerden devam eder: üretilmiş cümle atlanır (Colab oturumu kopsa da
dosyalar Drive'da kalır). Ses ancak sahibinin izniyle klonlanmalı.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import read_corpus  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--ref", required=True, nargs="+", help="Senin sesinden 10–30 sn kayıt (birden çok olabilir)")
    parser.add_argument("--out", required=True)
    parser.add_argument("--limit", type=int, default=0, help="Yalnızca ilk N cümle (0 = hepsi)")
    parser.add_argument("--device", default=None)
    parser.add_argument("--exaggeration", type=float, default=0.5)
    parser.add_argument("--cfg-weight", type=float, default=0.5)
    args = parser.parse_args()

    import soundfile
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = read_corpus(args.corpus, args.limit)
    todo = [row for row in rows if not (out / f"{row.id}.wav").exists()]
    print(f"{len(rows) - len(todo)} cümle hazır, {len(todo)} cümle üretilecek ({device})", flush=True)
    if not todo:
        return

    # Aygıt dize olarak verilmeli: Chatterbox ekran kartsız yüklemeyi "cpu" dizesine bakarak seçiyor
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    started = time.time()
    for n, row in enumerate(todo, 1):
        reference = args.ref[n % len(args.ref)]
        wav = model.generate(
            row.text,
            language_id="tr",
            audio_prompt_path=reference,
            exaggeration=args.exaggeration,
            cfg_weight=args.cfg_weight,
        )
        # Önce geçici ada yazılır: yarım kalan dosya "hazır" sayılmasın
        temporary = out / f"{row.id}.part.wav"
        soundfile.write(str(temporary), wav.squeeze().cpu().numpy(), model.sr)
        temporary.rename(out / f"{row.id}.wav")
        if n % 10 == 0 or n == len(todo):
            left = (time.time() - started) / n * (len(todo) - n) / 60
            print(f"{n}/{len(todo)} — kalan yaklaşık {left:.0f} dk", flush=True)


if __name__ == "__main__":
    main()
