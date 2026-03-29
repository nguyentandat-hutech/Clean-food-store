"""
============================================================
test_freshness_local.py — Freshness Detection (Offline)
Phân tích màu HSV bằng Pillow, không cần API key.

Logic:
  - Chuối TƯƠI  : màu vàng  (HSV: H 20-60°, S>40%, V>50%)
  - Chuối HỎng  : nâu/đen   (V thấp hoặc H ngoài dải vàng)

Chạy: python test_freshness_local.py
============================================================
"""
import sys
import json
from pathlib import Path
from PIL import Image

# ── Tham số màu sắc ──────────────────────────────────────────
# PIL colorsys: H ∈ [0,1), S ∈ [0,1), V ∈ [0,1)
FRESH_H_MIN  = 20 / 360   # 20°  — vàng chanh
FRESH_H_MAX  = 65 / 360   # 65°  — vàng xanh
FRESH_S_MIN  = 0.30        # bão hoà tối thiểu
FRESH_V_MIN  = 0.35        # độ sáng tối thiểu
MIN_OBJECT_COVER = 0.05    # ít nhất 5% pixel ảnh là object

# Nếu tỉ lệ rotten/(fresh+rotten) >= ngưỡng này → phân loại rotten
# (nguyên tắc an toàn thực phẩm: ưu tiên cảnh báo)
ROTTEN_RATIO_THRESHOLD = 0.35

SAMPLE_STEP = 4            # lấy mẫu mỗi 4 pixel (tăng tốc)


def rgb_to_hsv(r, g, b):
    """PIL không có HSV; chuyển tay: r,g,b ∈ [0,255] → h,s,v ∈ [0,1]."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx = max(r, g, b)
    mn = min(r, g, b)
    delta = mx - mn
    v = mx
    s = (delta / mx) if mx > 0 else 0
    if delta == 0:
        h = 0.0
    elif mx == r:
        h = ((g - b) / delta) % 6
        h /= 6
    elif mx == g:
        h = ((b - r) / delta + 2) / 6
    else:
        h = ((r - g) / delta + 4) / 6
    return h, s, v


def analyse_image(image_path: str):
    """
    Trả về dict:
      status     : 'fresh' | 'rotten' | 'unknown'
      confidence : 0-100
      fresh_pct  : % pixel tươi
      rotten_pct : % pixel hỏng
      detail     : thông tin thêm
    """
    path = Path(image_path)
    if not path.exists():
        return {"error": f"File not found: {image_path}"}

    img = Image.open(path).convert("RGB")
    w, h = img.size

    fresh_count  = 0
    rotten_count = 0
    total_sampled = 0

    for y in range(0, h, SAMPLE_STEP):
        for x in range(0, w, SAMPLE_STEP):
            r, g, b = img.getpixel((x, y))
            # bỏ nền trắng / xám nhạt
            if r > 220 and g > 220 and b > 220:
                continue
            hv, s, v = rgb_to_hsv(r, g, b)
            total_sampled += 1

            is_yellow = (
                FRESH_H_MIN <= hv <= FRESH_H_MAX
                and s >= FRESH_S_MIN
                and v >= FRESH_V_MIN
            )
            is_dark_or_brown = (
                v < 0.28
                or (hv < FRESH_H_MIN and v < 0.55 and s > 0.15)  # nâu
                or (v < 0.45 and s < 0.25)                        # xám tối
            )

            if is_yellow:
                fresh_count += 1
            elif is_dark_or_brown:
                rotten_count += 1

    if total_sampled == 0:
        return {"status": "unknown", "confidence": 0,
                "detail": "Ảnh toàn màu trắng / không có object"}

    fresh_pct  = fresh_count  / total_sampled * 100
    rotten_pct = rotten_count / total_sampled * 100

    total_classified = fresh_count + rotten_count
    cover = total_classified / total_sampled

    if cover < MIN_OBJECT_COVER:
        status = "unknown"
        confidence = 0
    else:
        total_classified = max(fresh_count + rotten_count, 1)
        rotten_ratio = rotten_count / total_classified

        if rotten_ratio >= ROTTEN_RATIO_THRESHOLD:
            # ≥35% pixel rotten trong tổng object → phân loại rotten
            # (nguyên tắc an toàn thực phẩm)
            status = "rotten"
            confidence = int(50 + rotten_ratio * 50)
        else:
            fresh_ratio = fresh_count / total_classified
            status = "fresh"
            confidence = int(50 + fresh_ratio * 50)

    return {
        "status":     status,
        "confidence": confidence,
        "fresh_pct":  round(fresh_pct,  1),
        "rotten_pct": round(rotten_pct, 1),
        "sampled_px": total_sampled,
        "image_size": f"{w}x{h}",
    }


def print_banner(char="=", width=57):
    print(char * width)


def test_image(image_path: str, expected: str) -> bool:
    name = Path(image_path).name
    print_banner()
    print(f"  TEST : {name}")
    print(f"  Path : {image_path}")
    print(f"  Expected: {expected.upper()}")
    print_banner()

    result = analyse_image(image_path)

    if "error" in result:
        print(f"  [ERROR] {result['error']}")
        return False

    status     = result["status"]
    confidence = result["confidence"]
    fresh_pct  = result["fresh_pct"]
    rotten_pct = result["rotten_pct"]
    sampled    = result["sampled_px"]
    size       = result["image_size"]

    # ── Chi tiết kết quả ───────────────────────────
    passed = (status == expected) and status != "unknown"

    tag = {
        "fresh":   "[FRESH 🟡]",
        "rotten":  "[ROTTEN 🟤]",
        "unknown": "[UNKNOWN ❓]",
    }.get(status, "[?]")

    print(f"  Image size  : {size} px  |  Sampled: {sampled} px")
    print(f"  🟡 Fresh  pixels : {fresh_pct:5.1f}%")
    print(f"  🟤 Rotten pixels : {rotten_pct:5.1f}%")
    print()
    print(f"  → {tag}  status = {status.upper():<8}  confidence = {confidence}%")
    print(f"  → Test   : {'✅ PASS' if passed else '❌ FAIL'}")

    # Save JSON result
    out = Path(image_path).parent / f"result_{name}.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  → JSON   : {out}")
    return passed


# ── Main ─────────────────────────────────────────────────────
if __name__ == "__main__":
    BACKEND = Path(__file__).parent.parent  # D:\da\a\backend

    test_cases = [
        (str(BACKEND / "freshbanana.jpg"), "fresh"),
        (str(BACKEND / "rotten.jpg"),      "rotten"),
    ]

    print("\n" + "=" * 57)
    print("  FRESHNESS DETECTION TEST  (Offline — HSV Color Analysis)")
    print("=" * 57)

    results = []
    for img_path, expected in test_cases:
        passed = test_image(img_path, expected)
        results.append((Path(img_path).name, expected, passed))
        print()

    print_banner()
    print("  SUMMARY")
    print_banner()
    ok = sum(1 for *_, p in results if p)
    total = len(results)
    for name, exp, p in results:
        icon = "✅ PASS" if p else "❌ FAIL"
        print(f"  {icon} | {name:<25} | expected = {exp}")
    print()
    print(f"  Result: {ok}/{total} passed")
    print_banner()

    sys.exit(0 if ok == total else 1)
