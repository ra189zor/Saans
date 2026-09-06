# Saans as one service: the API and the page it serves, on one port.
#
# Two stages. Node builds the frontend and is then thrown away, so the shipped
# image carries the built files but none of the toolchain that made them.

# --------------------------------------------------------------------------
# Stage 1 - build the frontend
# --------------------------------------------------------------------------
FROM node:22-slim AS web

WORKDIR /build

# Dependencies first, and only the two files that decide them. Change a
# component and this layer is still cached; change package.json and it is not.
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public

# Emits dist/, including the service worker and the precache manifest.
RUN npm run build


# --------------------------------------------------------------------------
# Stage 2 - the service
# --------------------------------------------------------------------------
FROM python:3.11-slim

# libgomp is what the TensorFlow and onnxruntime wheels link against for
# threading; without it the import fails at runtime rather than at build.
# curl is only here for the compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# TensorFlow is most of the install and it changes least, so it is its own
# layer above the application code.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server ./server
# The handbook itself, so the search index can be rebuilt inside the container.
COPY books ./books
COPY --from=web /build/dist ./dist

# Weights, the handbook index and the two self-downloading models live here.
# Mounted as a volume by compose; the directory exists so the container still
# starts without one, in demo mode.
RUN mkdir -p backend/models

# Written to on first use by the sentence encoder and the reranker.
ENV HF_HOME=/app/backend/models/.cache \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
