# syntax=docker/dockerfile:1

# Builder stage: install Python deps (including neoxra-core from Git)
FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

ARG NEOXRA_CORE_GIT_URL=https://github.com/Meridian-Global/neoxra-core.git
ARG NEOXRA_CORE_GIT_REF=main

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

RUN --mount=type=secret,id=GITHUB_TOKEN \
    pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt \
    && GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null || echo "") \
    && if [ -n "$GITHUB_TOKEN" ]; then \
        pip install --no-build-isolation "neoxra-core @ git+https://x-access-token:${GITHUB_TOKEN}@${NEOXRA_CORE_GIT_URL#https://}@${NEOXRA_CORE_GIT_REF}"; \
    else \
        pip install --no-build-isolation "neoxra-core @ git+${NEOXRA_CORE_GIT_URL}@${NEOXRA_CORE_GIT_REF}"; \
    fi

# Runtime stage: lean image without build tools
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    PATH="/venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /venv /venv

COPY . .

RUN python scripts/check_neoxra_core.py \
    && addgroup --system app \
    && adduser --system --ingroup app --home /app app \
    && chown -R app:app /app

USER app

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
