import os
import sys
import subprocess

try:
    from fish_audio_sdk import Session, TTSRequest
except ImportError:
    os.system(f"{sys.executable} -m pip install fish-audio-sdk -q")
    from fish_audio_sdk import Session, TTSRequest

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False

API_KEY       = os.environ.get("FISH_AUDIO_API_KEY", "99e2b2e493c740d0948abb71a3fec343")
VOICE_ID      = "5150667a8f3946a8b9d9c77e39868f17"  # "my voice" — Türkçe klon
VOLUME_DB     = 8      # +8dB
SPEED         = 1.10   # 1.10x hız
MP3_BITRATE   = 192
CHUNK_LENGTH  = 120    # Kısa chunk → doğal duraksamalar
LATENCY       = "balanced"

# Yabancı kelime → Türkçe fonetik tablosu
PHONETIC_MAP = {
    "Anthropic": "Entropik",
    "anthropic": "entropik",
    "Amazon":    "Amazın",
    "amazon":    "amazın",
    "Fable":     "Feybıl",
    "fable":     "feybıl",
    "Mythos":    "Maythos",
    "mythos":    "maythos",
    "jailbreak": "ceylbreyk",
    "Jailbreak": "Ceylbreyk",
    "Trump":     "Tramp",
    "trump":     "tramp",
    "Andy Jassy":    "Endi Cezi",
    "Scott Bessent": "Skot Besent",
    "CEO":  "yöneticisi",
    "AI":   "Yapay Zeka",
    "API":  "Ei Pi Ay",
    "GPT":  "Ci Pi Ti",
    "AWS":  "Ei Dablyu Es",
}


def apply_phonetics(text: str) -> str:
    for foreign, turkish in PHONETIC_MAP.items():
        text = text.replace(foreign, turkish)
    return text


def generate_audio(
    text: str,
    output_path: str = "output.mp3",
    apply_phonetic: bool = True,
) -> None:
    if apply_phonetic:
        text = apply_phonetics(text)

    print("Fish Audio API'ye bağlanılıyor...")
    session = Session(API_KEY)

    raw_path = output_path.replace(".mp3", "_raw.mp3")
    print(f'Ses üretiliyor: "{text[:70]}{"..." if len(text) > 70 else ""}"')

    with open(raw_path, "wb") as f:
        for chunk in session.tts(TTSRequest(
            text=text,
            reference_id=VOICE_ID,
            format="mp3",
            mp3_bitrate=MP3_BITRATE,
            latency=LATENCY,
            chunk_length=CHUNK_LENGTH,
            normalize=True,
        )):
            f.write(chunk)

    if FFMPEG_AVAILABLE:
        subprocess.run([
            "ffmpeg", "-y", "-i", raw_path,
            "-filter:a", f"atempo={SPEED},volume={VOLUME_DB}dB",
            "-codec:a", "libmp3lame", "-b:a", f"{MP3_BITRATE}k",
            output_path,
        ], capture_output=True, check=True)
        os.remove(raw_path)
    else:
        os.rename(raw_path, output_path)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Tamamlandı: {output_path} ({size_kb:.1f} KB | {SPEED}x hız | +{VOLUME_DB}dB)")


if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else (
        "Merhaba! Bu Fish Audio metin seslendirme testidir. Sistem başarıyla çalışıyor."
    )
    generate_audio(text)
