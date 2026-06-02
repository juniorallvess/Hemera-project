# ---- Stage 1: build the Vite SPA ----
FROM docker.io/library/node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build
# output: /build/dist

# ---- Stage 2: Python runtime ----
FROM docker.io/library/python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-build /build/dist ./frontend/dist
RUN chmod +x scripts/container_start.sh
EXPOSE 8000
CMD ["bash", "scripts/container_start.sh"]
