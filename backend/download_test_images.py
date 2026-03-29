"""
Script tải ảnh test chuối tươi và chuối hỏng từ internet
"""
import urllib.request
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).parent

# Ảnh chuối tươi + chuối hỏng từ Wikimedia Commons (public domain)
IMAGES = [
    (
        "freshbanana.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Chocolate-Chip-Cookies-Recipe.jpg/640px-Banana-Chocolate-Chip-Cookies-Recipe.jpg",
        # fallback
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Bananas_white_background_DS.jpg/1280px-Bananas_white_background_DS.jpg",
    ),
    (
        "rotten.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Rotten_banana.jpg/640px-Rotten_banana.jpg",
        # fallback
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Overripe_bananas.jpg/640px-Overripe_bananas.jpg",
    ),
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

for filename, url, fallback in IMAGES:
    dest = BACKEND_DIR / filename
    if dest.exists():
        print(f"[SKIP] {filename} đã tồn tại ({dest.stat().st_size} bytes)")
        continue
    for try_url in (url, fallback):
        try:
            req = urllib.request.Request(try_url, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            dest.write_bytes(data)
            print(f"[OK]   {filename} — {len(data)//1024} KB — {try_url}")
            break
        except Exception as e:
            print(f"[WARN] Không tải được từ {try_url}: {e}")
    else:
        print(f"[FAIL] Không thể tải {filename}")

print("\nDone.")
