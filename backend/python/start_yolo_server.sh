#!/bin/bash
# ============================================================
# start_yolo_server.sh — Khởi động Python YOLO Inference Server
# Dùng trên macOS / Linux
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[YOLO] Kiểm tra Python..."
if ! command -v python3 &>/dev/null; then
    echo "[LỖI] Python 3 chưa được cài đặt."
    exit 1
fi

# Kích hoạt venv nếu có
if [ -d "venv" ]; then
    echo "[YOLO] Kích hoạt virtual environment..."
    source venv/bin/activate
fi

# Cài thu viện nếu chưa có
python3 -c "import fastapi" 2>/dev/null || {
    echo "[YOLO] Cài đặt thư viện..."
    pip install -r requirements.txt
}

# Load .env
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

echo "[YOLO] Khởi động Freshness Detection Server trên cổng ${YOLO_SERVER_PORT:-8001}..."
python3 freshness_server.py
