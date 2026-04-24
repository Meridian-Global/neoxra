# syntax=docker/dockerfile:1

# Builder stage: install Python deps (including neoxra-core and neoxra-renderer from Git)
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

ARG GITHUB_TOKEN=""
ARG NEOXRA_CORE_GIT_URL=https://github.com/Meridian-Global/neoxra-core.git
ARG NEOXRA_CORE_GIT_REF=main
ARG NEOXRA_RENDERER_GIT_URL=https://github.com/Meridian-Global/neoxra-renderer.git
ARG NEOXRA_RENDERER_GIT_REF=main

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt \
    && if [ -n "$GITHUB_TOKEN" ]; then \
        pip install --no-build-isolation "neoxra-core @ git+https://x-access-token:${GITHUB_TOKEN}@${NEOXRA_CORE_GIT_URL#https://}@${NEOXRA_CORE_GIT_REF}"; \
        pip install --no-build-isolation "neoxra-renderer @ git+https://x-access-token:${GITHUB_TOKEN}@${NEOXRA_RENDERER_GIT_URL#https://}@${NEOXRA_RENDERER_GIT_REF}"; \
    else \
        pip install --no-build-isolation "neoxra-core @ git+${NEOXRA_CORE_GIT_URL}@${NEOXRA_CORE_GIT_REF}"; \
        pip install --no-build-isolation "neoxra-renderer @ git+${NEOXRA_RENDERER_GIT_URL}@${NEOXRA_RENDERER_GIT_REF}"; \
    fi

# Runtime stage: includes Playwright Chromium for server-side rendering
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    PATH="/venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /venv /venv

# Install Playwright system dependencies and Chromium browser
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
        libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/* \
    && playwright install chromium

COPY . .

RUN python scripts/check_neoxra_core.py \
    && addgroup --system app \
    && adduser --system --ingroup app --home /app app \
    && chown -R app:app /app

USER app

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
