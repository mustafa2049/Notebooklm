import os
import sys

try:
    from fish_audio_sdk import Session, TTSRequest
except ImportError:
    os.system(f"{sys.executable} -m pip install fish-audio-sdk -q")
    from fish_audio_sdk import Session, TTSRequest

API_KEY = os.environ.get("FISH_AUDIO_API_KEY", "99e2b2e493c740d0948abb71a3fec343")
# Kullanıcının klonlanmış sesi: "my voice" (Türkçe)
DEFAULT_VOICE_ID = "5150667a8f3946a8b9d9c77e39868f17"
OUTPUT_FILE = "output.mp3"

TEXT = "Merhaba! Bu Fish Audio metin seslendirme testidir. Sistem başarıyla çalışıyor."


def generate_audio(text: str, output_path: str = OUTPUT_FILE, voice_id: str = DEFAULT_VOICE_ID) -> None:
    print(f"Fish Audio API'ye bağlanılıyor...")
    session = Session(API_KEY)

    print(f'Ses üretiliyor: "{text[:60]}{"..." if len(text) > 60 else ""}"')
    with open(output_path, "wb") as f:
        for chunk in session.tts(TTSRequest(
            text=text,
            reference_id=voice_id,
            format="mp3",
            mp3_bitrate=192,     # En yüksek kalite
            latency="balanced",  # Kalite öncelikli mod
            chunk_length=150,    # Doğal duraksamalar için küçük chunk
            normalize=True,      # Ses seviyesi dengeleme
        )):
            f.write(chunk)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Tamamlandı: {output_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else TEXT
    generate_audio(text)
