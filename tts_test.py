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

API_KEY = os.environ.get("FISH_AUDIO_API_KEY", "99e2b2e493c740d0948abb71a3fec343")
DEFAULT_VOICE_ID = "5150667a8f3946a8b9d9c77e39868f17"  # "my voice" — Türkçe klon
DEFAULT_VOLUME_DB = 8  # +8dB varsayılan yükseltme


def generate_audio(
    text: str,
    output_path: str = "output.mp3",
    voice_id: str = DEFAULT_VOICE_ID,
    volume_db: int = DEFAULT_VOLUME_DB,
) -> None:
    print("Fish Audio API'ye bağlanılıyor...")
    session = Session(API_KEY)

    raw_path = output_path.replace(".mp3", "_raw.mp3")
    print(f'Ses üretiliyor: "{text[:60]}{"..." if len(text) > 60 else ""}"')

    with open(raw_path, "wb") as f:
        for chunk in session.tts(TTSRequest(
            text=text,
            reference_id=voice_id,
            format="mp3",
            mp3_bitrate=192,       # En yüksek kalite
            latency="balanced",    # Kalite öncelikli mod
            chunk_length=120,      # Kısa chunk = doğal, dramatik duraksamalar
            normalize=True,        # Ses seviyesi dengeleme
        )):
            f.write(chunk)

    if FFMPEG_AVAILABLE and volume_db != 0:
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", raw_path,
            "-filter:a", f"volume={volume_db}dB",
            "-codec:a", "libmp3lame", "-b:a", "192k",
            output_path,
        ], capture_output=True, text=True)
        os.remove(raw_path)
        if result.returncode != 0:
            os.rename(raw_path, output_path)
    else:
        os.rename(raw_path, output_path)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Tamamlandı: {output_path} ({size_kb:.1f} KB, +{volume_db}dB)")


if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else (
        "Merhaba! Bu Fish Audio metin seslendirme testidir. Sistem başarıyla çalışıyor."
    )
    generate_audio(text)
