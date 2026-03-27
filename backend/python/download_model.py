"""
============================================================
download_model.py — Script tải model YOLO về local
============================================================
Chạy một lần để tải weights về máy:
    python download_model.py

Sau khi tải xong, weights được cache trong thư mục
inference-sdk mặc định (~/.inference hoặc ./models/).
Lần sau freshness_server.py sẽ dùng cache mà không cần
tải lại từ internet.

Yêu cầu:
    pip install inference-sdk roboflow
    Đặt ROBOFLOW_API_KEY trong .env hoặc biến môi trường
============================================================
"""
import os
import sys
from pathlib import Path

# Load .env nếu chạy trực tiếp
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[INFO] Loaded .env từ: {env_path}")
except ImportError:
    pass  # python-dotenv không bắt buộc

API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
if not API_KEY:
    print("\n[LỖI] Chưa đặt ROBOFLOW_API_KEY!")
    print("  1. Đăng ký free tại: https://app.roboflow.com/signup")
    print("  2. Vào Settings → Roboflow API → copy Private API Key")
    print("  3. Thêm vào backend/.env:")
    print("     ROBOFLOW_API_KEY=rf_xxxxxxxxxxxxxx")
    sys.exit(1)

MODEL_ID = "freshness-detection-vwn1a/freshness-detection-rhrze/4"

print(f"\n[INFO] Đang tải model: {MODEL_ID}")
print("[INFO] Quá trình này chỉ cần chạy 1 lần, weights sẽ được cache local.\n")

try:
    from inference import get_model
    model = get_model(model_id=MODEL_ID, api_key=API_KEY)
    print("[✓] Model đã tải thành công!")
    print(f"[✓] Workspace : freshness-detection-vwn1a")
    print(f"[✓] Project   : freshness-detection-rhrze")
    print(f"[✓] Version   : 4  (8666 ảnh, YOLOv8)")
    print("\n[✓] Bạn có thể chạy server bằng:")
    print("    python freshness_server.py")
except ImportError:
    print("[LỖI] Chưa cài inference-sdk. Chạy:")
    print("    pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"[LỖI] Không thể tải model: {e}")
    print("\nKiểm tra lại:")
    print("  - API key có đúng không?")
    print("  - Kết nối Internet có ổn không?")
    sys.exit(1)
