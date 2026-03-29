"""
============================================================
Freshness Detection Server — FastAPI + Roboflow Inference
Model: freshness-detection-vwn1a/freshness-detection-rhrze (v4)
       8666 ảnh huấn luyện, YOLOv8, phân loại fresh/rotten
Endpoint: POST /predict  →  { status, confidence, message }
============================================================
"""
import os
import base64
import io
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import uvicorn

# Roboflow Inference SDK (tải weights local khi request đầu tiên)
from inference import get_model

logging.basicConfig(level=logging.INFO, format="[YOLO] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Cấu hình ────────────────────────────────────────────────────────────────
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
# Model ID: workspace/project/version
MODEL_ID = "freshness-detection-vwn1a/freshness-detection-rhrze/4"
# Ngưỡng confidence tối thiểu để coi là phát hiện hợp lệ (0–1)
CONFIDENCE_THRESHOLD = 0.35
PORT = int(os.environ.get("YOLO_SERVER_PORT", 8001))

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Freshness Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Client được khởi tạo lazy khi request đầu tiên đến /predict
_client = None


def get_loaded_model():
    """Lazy-load model để trả lời health-check ngay cả khi model chưa ready."""
    global _model
    if _model is None:
        if not ROBOFLOW_API_KEY:
            raise RuntimeError("Biến môi trường ROBOFLOW_API_KEY chưa được đặt.")
        logger.info(f"Đang tải model: {MODEL_ID} …")
        try:
            _model = get_model(model_id=MODEL_ID, api_key=ROBOFLOW_API_KEY)
            logger.info("Model sẵn sàng!")
        except Exception as e:
            # Bao gồm: API key hết hạn (403), không có quyền, lỗi mạng, v.v.
            raise RuntimeError(f"Không thể tải model từ Roboflow: {e}")
    return _model


# ── Mapping nhãn YOLO → tiếng Việt ─────────────────────────────────────────
FRESH_KEYWORDS = {
    "fresh_apple", "fresh_banana", "fresh_bitter_gourd", "fresh_capsicum",
    "fresh_orange", "fresh_tomato", "fresh_cucumber", "fresh_lemon",
    "fresh_mango", "fresh_potato", "fresh_strawberry", "fresh_grapes",
    "fresh_bellpepper", "fresh_chilli", "fresh_eggplant", "fresh_spinach",
    "fresh", "freshapple", "freshbanana", "freshorange", "freshtomato",
    "fresh_carrot", "fresh_corn", "fresh_onion", "fresh_garlic",
    "fresh_ginger", "fresh_lettuce", "fresh_broccoli", "fresh_cauliflower",
}
ROTTEN_KEYWORDS = {
    "rotten_apple", "rotten_banana", "rotten_bitter_gourd", "rotten_capsicum",
    "rotten_orange", "rotten_tomato", "rotten_cucumber", "rotten_lemon",
    "rotten_mango", "rotten_potato", "rotten_strawberry", "rotten_grapes",
    "rotten_bellpepper", "rotten_chilli", "rotten_eggplant", "rotten_spinach",
    "rotten", "rottenapple", "rottenbanana", "rottenorange", "rottentomato",
    "rotten_carrot", "rotten_corn", "rotten_onion", "rotten_garlic",
    "rotten_ginger", "rotten_lettuce", "rotten_broccoli", "rotten_cauliflower",
}

# Tên thực phẩm dễ đọc (dùng trong message)
FOOD_NAMES_VI = {
    "apple": "táo", "banana": "chuối", "orange": "cam", "tomato": "cà chua",
    "cucumber": "dưa leo", "lemon": "chanh", "mango": "xoài",
    "potato": "khoai tây", "strawberry": "dâu tây", "grapes": "nho",
    "capsicum": "ớt chuông", "bellpepper": "ớt chuông", "chilli": "ớt",
    "bitter_gourd": "khổ qua", "eggplant": "cà tím", "spinach": "rau bina",
    "carrot": "cà rốt", "corn": "ngô", "onion": "hành tây",
    "garlic": "tỏi", "ginger": "gừng", "lettuce": "xà lách",
    "broccoli": "bông cải", "cauliflower": "súp lơ",
}


def _classify_label(label: str) -> Optional[str]:
    """Trả về 'fresh' | 'rotten' | None dựa trên tên nhãn."""
    label_lower = label.lower().replace(" ", "_").replace("-", "_")
    if label_lower in FRESH_KEYWORDS or label_lower.startswith("fresh"):
        return "fresh"
    if label_lower in ROTTEN_KEYWORDS or label_lower.startswith("rotten"):
        return "rotten"
    return None


def _extract_food_name_vi(label: str) -> str:
    """Trích tên thực phẩm từ nhãn YOLO rồi dịch sang tiếng Việt."""
    label_lower = label.lower().replace(" ", "_").replace("-", "_")
    for eng, vi in FOOD_NAMES_VI.items():
        if eng in label_lower:
            return vi
    return "thực phẩm"


def _build_result(predictions) -> dict:
    """
    Phân tích danh sách dự đoán từ YOLO và tổng hợp thành kết quả độ tươi.
    Chiến lược:
      - Lấy tất cả detection vượt ngưỡng
      - Tổng hợp confidence trung bình của nhóm fresh/rotten
      - Nhóm nào cao hơn thì thắng
      - Nếu không có detection → "Không xác định"
    """
    if not predictions:
        return {
            "status": "Không xác định",
            "confidence": 0,
            "message": (
                "Không phát hiện thực phẩm rõ ràng trong ảnh. "
                "Vui lòng chụp lại gần hơn và đủ ánh sáng."
            ),
        }

    fresh_scores = []
    rotten_scores = []
    fresh_foods = []
    rotten_foods = []

    for pred in predictions:
        label = pred.class_name if hasattr(pred, "class_name") else str(pred.get("class", ""))
        conf = float(pred.confidence if hasattr(pred, "confidence") else pred.get("confidence", 0))
        if conf < CONFIDENCE_THRESHOLD:
            continue
        kind = _classify_label(label)
        food_vi = _extract_food_name_vi(label)
        if kind == "fresh":
            fresh_scores.append(conf)
            if food_vi not in fresh_foods:
                fresh_foods.append(food_vi)
        elif kind == "rotten":
            rotten_scores.append(conf)
            if food_vi not in rotten_foods:
                rotten_foods.append(food_vi)

    if not fresh_scores and not rotten_scores:
        return {
            "status": "Không xác định",
            "confidence": 0,
            "message": (
                "Không nhận diện được loại thực phẩm. "
                "Có thể ảnh không rõ hoặc đây không phải thực phẩm."
            ),
        }

    avg_fresh = (sum(fresh_scores) / len(fresh_scores)) if fresh_scores else 0
    avg_rotten = (sum(rotten_scores) / len(rotten_scores)) if rotten_scores else 0

    if avg_fresh >= avg_rotten:
        food_list = "、".join(fresh_foods) or "thực phẩm"
        return {
            "status": "Tươi",
            "confidence": round(avg_fresh * 100),
            "message": (
                f"Mô hình YOLO phát hiện {food_list} ở trạng thái tươi tốt. "
                f"Độ tin cậy: {round(avg_fresh * 100)}%. "
                "Sản phẩm đạt tiêu chuẩn chất lượng, an toàn để sử dụng."
            ),
        }
    else:
        food_list = "、".join(rotten_foods) or "thực phẩm"
        return {
            "status": "Không tươi",
            "confidence": round(avg_rotten * 100),
            "message": (
                f"Mô hình YOLO phát hiện {food_list} có dấu hiệu hư hỏng/không còn tươi. "
                f"Độ tin cậy: {round(avg_rotten * 100)}%. "
                "Vui lòng kiểm tra và không sử dụng nếu có mùi lạ hoặc bề mặt bị hỏng."
            ),
        }


# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_ID}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Nhận file ảnh (multipart/form-data), chạy YOLO inference,
    trả về { status, confidence, message }.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/jpg"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh JPEG/PNG/WEBP.")

    try:
        model = get_loaded_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi khởi tạo model: {e}")
        raise HTTPException(status_code=503, detail="Model YOLO chưa sẵn sàng.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=413, detail="Ảnh quá lớn (tối đa 10 MB).")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Không thể đọc file ảnh.")

    try:
        results = model.infer(image, confidence=CONFIDENCE_THRESHOLD)
        predictions = results[0].predictions if results else []
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi chạy mô hình YOLO.")

    result = _build_result(predictions)
    logger.info(f"Kết quả: {result['status']} ({result['confidence']}%)")
    return JSONResponse(content=result)


@app.post("/predict-base64")
async def predict_base64(image_b64: str = Form(...)):
    """
    Nhận ảnh base64, chạy inference.
    Dùng khi Node.js không muốn gửi multipart.
    """
    try:
        model = get_loaded_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi khởi tạo model: {e}")
        raise HTTPException(status_code=503, detail="Model YOLO chưa sẵn sàng.")

    try:
        # Bỏ prefix "data:image/jpeg;base64," nếu có
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Dữ liệu base64 không hợp lệ.")

    try:
        results = model.infer(image, confidence=CONFIDENCE_THRESHOLD)
        predictions = results[0].predictions if results else []
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi chạy mô hình YOLO.")

    result = _build_result(predictions)
    return JSONResponse(content=result)


# ── Chạy trực tiếp ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("freshness_server:app", host="0.0.0.0", port=PORT, reload=False)
