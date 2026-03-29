# ================================================================
# backend/python/Dockerfile — Python FastAPI YOLO Server
# Dùng Python 3.11 slim để cân bằng kích thước / tương thích
# ================================================================

FROM python:3.12-slim-bookworm

WORKDIR /app

# Cài hệ thống deps cần thiết để build một số Python package
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy và cài Python deps trước (tận dụng Docker layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source server
COPY freshness_server.py ./

# Thư mục cache model weights (mount volume từ docker-compose)
RUN mkdir -p /root/.inference

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "freshness_server.py"]
