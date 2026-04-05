# ================================================================
# backend/Dockerfile — Node.js Express API
# Multi-stage: deps → production image
# ================================================================

# ── Stage 1: Cài dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
# Chỉ cài production deps để image nhỏ gọn
RUN npm ci --omit=dev

# ── Stage 2: Production image ──────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Cài curl để dùng healthcheck
RUN apk add --no-cache curl

# Copy deps đã cài từ stage trước
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src/ ./src/
COPY package.json ./

# Thư mục lưu file upload tạm (multer)
RUN mkdir -p uploads

# Chạy với user không phải root (bảo mật)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

CMD ["node", "src/server.js"]
