"""Eğitilen sesten telefona yüklenecek paketi üretir.

Kullanım:
  python export.py --work egitim --name "Benim sesim" --out paket --corpus corpus.tsv [--checkpoint yol.ckpt]

Çıktı (standart Piper biçimi):
  tr_TR-<ad>-medium.onnx        model
  tr_TR-<ad>-medium.onnx.json   yapılandırma (Hızlı Okuma çözümleyici sürümüyle)
  tr_TR-<ad>-medium.zip         ikisi birlikte (web için)
  ornek.wav                     dinlemek için örnek cümle

Kontrol noktası verilmezse en yenisi (last.ckpt) kullanılır.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unicodedata
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import phonemizer_version, read_corpus  # noqa: E402

SAMPLE_TEXT = "Merhaba! Bu benim sesim."


def slug(name: str) -> str:
    text = unicodedata.normalize("NFKD", name.replace("ı", "i").replace("İ", "I"))
    text = re.sub(r"[^A-Za-z0-9]+", "-", text.encode("ascii", "ignore").decode()).strip("-").lower()
    return text or "kendi-sesim"


def phoneme_ids(phonemes: str, id_map: dict) -> list:
    """Piper dizilimi: ^ _ p1 _ p2 _ … $ (bilinmeyen sembol atlanır)."""
    ids = [*id_map["^"], *id_map["_"]]
    for phoneme in unicodedata.normalize("NFD", phonemes):
        if phoneme in id_map:
            ids += [*id_map[phoneme], *id_map["_"]]
    return ids + [*id_map["$"]]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--work", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--checkpoint", default=None)
    parser.add_argument("--backup", default=None, help="Yerelde kontrol noktası yoksa bakılacak yedek klasörü (Drive)")
    args = parser.parse_args()

    work = Path(args.work)
    backup = Path(args.backup) if args.backup else None
    checkpoint = Path(args.checkpoint) if args.checkpoint else None
    if not checkpoint:
        candidates = sorted((work / "runs").rglob("last.ckpt"), key=lambda path: path.stat().st_mtime)
        if candidates:
            checkpoint = candidates[-1]
        elif backup and (backup / "last.ckpt").exists():
            checkpoint = backup / "last.ckpt"
        else:
            sys.exit("Kontrol noktası yok: önce train.py çalışmalı.")
    config_path = work / "config.json"
    if not config_path.exists() and backup and (backup / "config.json").exists():
        config_path = backup / "config.json"
    if not config_path.exists():
        sys.exit("config.json yok: eğitim en az bir kez başlamış olmalı.")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    base = f"tr_TR-{slug(args.name)}-medium"
    model_path = out / f"{base}.onnx"
    print(f"Dışa aktarılıyor: {checkpoint}", flush=True)
    subprocess.run(
        [
            sys.executable,
            str(Path(__file__).parent / "onnx_export.py"),
            "--checkpoint",
            str(checkpoint),
            "--output-file",
            str(model_path),
        ],
        check=True,
    )

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["language"] = {
        "code": "tr_TR",
        "family": "tr",
        "region": "TR",
        "name_native": "Türkçe",
        "name_english": "Turkish",
        "country_english": "Turkey",
    }
    config["dataset"] = slug(args.name)
    config["hizliokuma"] = {"phonemizer": phonemizer_version(args.corpus), "voice_name": args.name}
    config_out = out / f"{base}.onnx.json"
    config_out.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")

    with zipfile.ZipFile(out / f"{base}.zip", "w", zipfile.ZIP_STORED) as archive:
        archive.write(model_path, model_path.name)
        archive.write(config_out, config_out.name)

    # Örnek: derlemdeki kısa bir cümle (fonemleri hazır)
    import numpy
    import onnxruntime
    import soundfile

    rows = sorted(read_corpus(args.corpus), key=lambda row: len(row.text))
    row = next((r for r in rows if len(r.text.split()) >= 6), rows[0])
    session = onnxruntime.InferenceSession(str(model_path))
    ids = numpy.array([phoneme_ids(row.phonemes, config["phoneme_id_map"])], dtype=numpy.int64)
    inference = config.get("inference", {})
    scales = numpy.array(
        [inference.get("noise_scale", 0.667), inference.get("length_scale", 1.0), inference.get("noise_w", 0.8)],
        dtype=numpy.float32,
    )
    audio = session.run(None, {"input": ids, "input_lengths": numpy.array([ids.shape[1]], dtype=numpy.int64), "scales": scales})[0]
    soundfile.write(str(out / "ornek.wav"), audio.squeeze(), config["audio"]["sample_rate"])
    size = model_path.stat().st_size / 1048576
    print(f"Hazır: {model_path.name} ({size:.0f} MB) + {config_out.name}; örnek cümle: {row.text}")


if __name__ == "__main__":
    main()
