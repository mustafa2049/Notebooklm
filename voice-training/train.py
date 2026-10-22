"""Piper ses modelini kayıtlarınla eğitir (Türkçe dfki modelinden başlayarak).

Kullanım:
  python train.py --metadata metadata.csv --wavs wavs --work egitim \
      --base dfki.ckpt --epochs 300 [--backup /content/drive/MyDrive/HizliOkumaSes]

- İlk çalıştırmada Türkçe dfki modelinin ağırlıkları alınır
  (`--model.warmstart_ckpt`): ses Türkçeyi baştan öğrenmez, yalnızca senin
  sesine uyar. Eğitim 0. epoch'tan başlar.
- Sonraki çalıştırmalarda kaldığı yerden (last.ckpt) devam eder. `--backup`
  verilirse son kontrol noktası oraya (Drive) düzenli kopyalanır; yeni bir
  Colab oturumunda oradan geri alınır.
- Dinlemek için çalışmayı durdur (Colab'da ■), export.py ile paketi üret;
  sonra bu betiği yeniden çalıştır, kaldığı yerden sürer.

Fonemler derlemden gelir (bu uygulamanın çözümleyicisi): `--data.phoneme_type text`.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

BACKUP_EVERY_SEC = 600


def newest(paths) -> Optional[Path]:
    paths = [path for path in paths if path.exists()]
    return max(paths, key=lambda path: path.stat().st_mtime) if paths else None


def latest_checkpoint(work: Path) -> Optional[Path]:
    return newest((work / "runs").rglob("last.ckpt"))


def backup(work: Path, target: Optional[Path], state: dict) -> None:
    """Son kontrol noktasını yedek klasörüne kopyalar (değiştiyse)."""
    if not target:
        return
    last = latest_checkpoint(work)
    if not last or last.stat().st_mtime <= state.get("copied", 0):
        return
    target.mkdir(parents=True, exist_ok=True)
    partial = target / "last.ckpt.part"
    shutil.copyfile(last, partial)
    partial.replace(target / "last.ckpt")
    for name in ("config.json",):
        if (work / name).exists():
            shutil.copyfile(work / name, target / name)
    state["copied"] = last.stat().st_mtime
    print(f"[yedek] {last.name} → {target}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--metadata", required=True, help="filter.py'nin yazdığı liste")
    parser.add_argument("--wavs", required=True)
    parser.add_argument("--work", required=True, help="Eğitim klasörü (yerel disk)")
    parser.add_argument("--base", required=True, help="Türkçe dfki kontrol noktası (.ckpt)")
    parser.add_argument("--epochs", type=int, default=300)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--name", default="kendi-sesim")
    parser.add_argument("--backup", default=None, help="Son kontrol noktasının kopyalanacağı klasör (Drive)")
    parser.add_argument("extra", nargs="*", help="piper.train'e olduğu gibi geçer (ör. --trainer.max_steps 2)")
    args = parser.parse_args()

    import torch

    work = Path(args.work)
    work.mkdir(parents=True, exist_ok=True)
    target = Path(args.backup) if args.backup else None

    # Yeni oturum: yerelde kontrol noktası yok ama yedekte var → geri al
    resume = latest_checkpoint(work)
    if not resume and target and (target / "last.ckpt").exists():
        restored = work / "runs" / "restored" / "checkpoints" / "last.ckpt"
        restored.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(target / "last.ckpt", restored)
        resume = restored
        print(f"Yedekten devam: {target / 'last.ckpt'}", flush=True)

    gpu = torch.cuda.is_available()
    command = [
        sys.executable, str(Path(__file__).parent / "piper_fit.py"), "fit",
        "--data.voice_name", args.name,
        "--data.csv_path", args.metadata,
        "--data.audio_dir", args.wavs,
        "--model.sample_rate", "22050",
        "--data.espeak_voice", "tr",
        "--data.phoneme_type", "text",
        "--data.cache_dir", str(work / "cache"),
        "--data.config_path", str(work / "config.json"),
        "--data.batch_size", str(args.batch_size),
        "--data.num_workers", "2",
        "--model.mos_metric", "none",
        "--trainer.max_epochs", str(args.epochs),
        "--trainer.default_root_dir", str(work / "runs"),
        "--trainer.accelerator", "gpu" if gpu else "cpu",
        "--trainer.devices", "1",
    ]
    if resume:
        command += ["--ckpt_path", str(resume)]
        print(f"Kaldığı yerden devam: {resume}", flush=True)
    else:
        command += ["--model.warmstart_ckpt", args.base]
        print("Türkçe dfki modelinden başlanıyor.", flush=True)
    command += args.extra

    state: dict = {}
    process = subprocess.Popen(command)
    try:
        last_backup = time.time()
        while process.poll() is None:
            time.sleep(5)
            if time.time() - last_backup > BACKUP_EVERY_SEC:
                backup(work, target, state)
                last_backup = time.time()
    except KeyboardInterrupt:
        print("Durduruluyor; son kontrol noktası yedekleniyor…", flush=True)
        process.terminate()
        try:
            process.wait(timeout=60)
        except subprocess.TimeoutExpired:
            process.kill()
    finally:
        backup(work, target, state)
    if process.returncode not in (0, None, -15):
        sys.exit(f"Eğitim hata ile bitti (kod {process.returncode}).")


if __name__ == "__main__":
    main()
