# ================================================================
# frontend/Dockerfile — React/Vite (multi-stage build + Nginx)
# Stage 1: Build React app với Vite
# Stage 2: Serve static files bằng Nginx
# ================================================================

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# ARG để nhận VITE_ env lúc build (Vite nhúng vào bundle)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
# Output: /app/dist

# ── Stage 2: Nginx ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copy static build từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Cấu hình Nginx (proxy /api → backend, SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Xóa config mặc định của Nginx
RUN rm -f /etc/nginx/conf.d/example_ssl.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
