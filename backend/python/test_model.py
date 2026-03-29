"""
============================================================
test_model.py - Test Freshness Detection Model
Uses Roboflow HTTP API directly  
Run: python test_model.py
============================================================
"""
import os
import sys
import base64
import json
from pathlib import Path

# Load .env manually
API_KEY = ""
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("ROBOFLOW_API_KEY="):
            API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if not API_KEY:
    API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")

if not API_KEY:
    print("[ERROR] ROBOFLOW_API_KEY not set!")
    sys.exit(1)

import requests

MODEL_ID = "freshness-detection-rhrze"
MODEL_VERSION = "4"
ROBOFLOW_DETECT_URL = f"https://detect.roboflow.com/{MODEL_ID}/{MODEL_VERSION}"
CONFIDENCE_THRESHOLD = 35

FRESH_KEYWORDS = {
    "fresh_apple", "fresh_banana", "fresh_bitter_gourd", "fresh_capsicum",
    "fresh_orange", "fresh_tomato", "fresh_cucumber", "fresh_lemon",
    "fresh_mango", "fresh_potato", "fresh_strawberry", "fresh_grapes",
    "fresh_bellpepper", "fresh_chilli", "fresh_eggplant", "fresh_spinach",
    "fresh", "freshapple", "freshbanana", "freshorange", "freshtomato",
}
ROTTEN_KEYWORDS = {
    "rotten_apple", "rotten_banana", "rotten_bitter_gourd", "rotten_capsicum",
    "rotten_orange", "rotten_tomato", "rotten_cucumber", "rotten_lemon",
    "rotten_mango", "rotten_potato", "rotten_strawberry", "rotten_grapes",
    "rotten_bellpepper", "rotten_chilli", "rotten_eggplant", "rotten_spinach",
    "rotten", "rottenapple", "rottenbanana", "rottenorange", "rottentomato",
}


def classify_label(label):
    ll = label.lower().replace(" ", "_").replace("-", "_")
    if ll in FRESH_KEYWORDS or ll.startswith("fresh"):
        return "fresh"
    if ll in ROTTEN_KEYWORDS or ll.startswith("rotten"):
        return "rotten"
    return None


def predict_image(image_path):
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    resp = requests.post(
        ROBOFLOW_DETECT_URL,
        params={"api_key": API_KEY, "confidence": CONFIDENCE_THRESHOLD},
        data=img_b64,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"  [ERROR] API returned {resp.status_code}: {resp.text}")
        return None
    return resp.json()


def test_image(image_path, expected):
    name = Path(image_path).name
    print(f"\n{'='*55}")
    print(f"  TEST: {name}")
    print(f"  Expected: {expected}")
    print(f"{'='*55}")

    if not Path(image_path).exists():
        print(f"  [ERROR] File not found: {image_path}")
        return False

    result = predict_image(image_path)
    if result is None:
        return False

    predictions = result.get("predictions", [])
    print(f"  Detections: {len(predictions)}")

    fresh_scores = []
    rotten_scores = []

    for i, pred in enumerate(predictions):
        label = pred.get("class", "")
        conf = float(pred.get("confidence", 0))
        kind = classify_label(label)
        icon = "[FRESH]" if kind == "fresh" else "[ROTTEN]" if kind == "rotten" else "[?]"
        
        print(f"  {icon} #{i+1}: {label} => {round(conf*100)}%", end="")
        if "x" in pred:
            print(f" (bbox: {pred['x']:.0f},{pred['y']:.0f},{pred['width']:.0f},{pred['height']:.0f})", end="")
        print()

        if conf >= (CONFIDENCE_THRESHOLD / 100):
            if kind == "fresh":
                fresh_scores.append(conf)
            elif kind == "rotten":
                rotten_scores.append(conf)

    avg_fresh = (sum(fresh_scores) / len(fresh_scores)) if fresh_scores else 0
    avg_rotten = (sum(rotten_scores) / len(rotten_scores)) if rotten_scores else 0

    if not fresh_scores and not rotten_scores:
        final = "unknown"
        final_conf = 0
    elif avg_fresh >= avg_rotten:
        final = "fresh"
        final_conf = round(avg_fresh * 100)
    else:
        final = "rotten"
        final_conf = round(avg_rotten * 100)

    passed = (
        (expected == "fresh" and final == "fresh") or
        (expected == "rotten" and final == "rotten")
    )

    print(f"\n  --- RESULT ---")
    print(f"  Status     : {final}")
    print(f"  Confidence : {final_conf}%")
    print(f"  Fresh avg  : {round(avg_fresh*100)}%")
    print(f"  Rotten avg : {round(avg_rotten*100)}%")
    print(f"  Test       : {'PASS' if passed else 'FAIL'}")
    
    # Save raw JSON for debugging
    output_file = Path(__file__).parent / f"result_{name}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"  Raw JSON   : {output_file}")
    
    return passed


# Run tests
print("FRESHNESS DETECTION MODEL TEST")
print(f"API URL: {ROBOFLOW_DETECT_URL}")
print(f"Confidence: {CONFIDENCE_THRESHOLD}%")

test_cases = [
    (str(Path(__file__).parent.parent / "freshbanana.jpg"), "fresh"),
    (str(Path(__file__).parent.parent / "rotten.jpg"), "rotten"),
]

results = []
for path, expected in test_cases:
    passed = test_image(path, expected)
    results.append((Path(path).name, expected, passed))

print(f"\n{'='*55}")
print("  SUMMARY")
print(f"{'='*55}")
total = len(results)
ok = sum(1 for _, _, p in results if p)
for name, exp, p in results:
    print(f"  {'PASS' if p else 'FAIL'} | {name:25s} | expected={exp}")
print(f"\n  Result: {ok}/{total} passed")
print(f"{'='*55}")
