import os
import sys

try:
    from fish_audio_sdk import Session, TTSRequest
except ImportError:
    print("fish-audio-sdk bulunamadı. Yükleniyor...")
    os.system(f"{sys.executable} -m pip install fish-audio-sdk -q")
    from fish_audio_sdk import Session, TTSRequest

API_KEY = os.environ.get("FISH_AUDIO_API_KEY", "99e2b2e493c740d0948abb71a3fec343")
OUTPUT_FILE = "output.mp3"

# Üretilecek metin
TEXT = "Merhaba! Bu Fish Audio metin seslendirme testidir. Sistem başarıyla çalışıyor."

def generate_audio(text: str, output_path: str = OUTPUT_FILE) -> None:
    print(f"Fish Audio API'ye bağlanılıyor...")
    session = Session(API_KEY)

    print(f"Ses üretiliyor: \"{text}\"")
    with open(output_path, "wb") as f:
        for chunk in session.tts(TTSRequest(
            text=text,
            format="mp3",
            mp3_bitrate=128,
            latency="normal",
        )):
            f.write(chunk)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Tamamlandı: {output_path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else TEXT
    generate_audio(text)
