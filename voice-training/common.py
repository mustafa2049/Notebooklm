"""Eğitim betiklerinin ortak parçaları (yalnızca standart kütüphane)."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import List, NamedTuple


class Row(NamedTuple):
    id: str
    text: str
    phonemes: str


def read_corpus(path: str | Path, limit: int = 0) -> List[Row]:
    """corpus.tsv: kimlik, söylenecek metin, fonemler (# ile başlayan satırlar açıklama)."""
    rows: List[Row] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            raise ValueError(f"Bozuk derlem satırı: {line[:60]}")
        rows.append(Row(*parts))
    return rows[:limit] if limit > 0 else rows


def phonemizer_version(path: str | Path) -> int:
    """Derlemin başlığındaki çözümleyici sürümü (phonemizer=N)."""
    head = Path(path).read_text(encoding="utf-8")[:300]
    match = re.search(r"phonemizer=(\d+)", head)
    return int(match.group(1)) if match else 1


def tr_lower(text: str) -> str:
    return text.replace("I", "ı").replace("İ", "i").lower()


def comparable(text: str) -> str:
    """Yazıya dökümü metinle karşılaştırmak için: küçük harf, noktalama ve şapkasız."""
    text = unicodedata.normalize("NFC", tr_lower(text))
    text = text.replace("â", "a").replace("î", "i").replace("û", "u")
    text = re.sub(r"[^a-zçğıöşü ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def char_error_rate(reference: str, hypothesis: str) -> float:
    """Karakter hata oranı (Levenshtein / başvuru uzunluğu)."""
    ref, hyp = comparable(reference), comparable(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    previous = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        current = [i]
        for j, h in enumerate(hyp, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (r != h)))
        previous = current
    return previous[-1] / len(ref)
