FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

ARG NEOXRA_CORE_GIT_URL=https://github.com/Meridian-Global/neoxra-core.git
ARG NEOXRA_CORE_GIT_REF=main
ARG GITHUB_TOKEN=

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -r requirements.txt \
    && if [ -n "${GITHUB_TOKEN}" ]; then \
        python -m pip install --no-build-isolation "neoxra-core @ git+https://x-access-token:${GITHUB_TOKEN}@${NEOXRA_CORE_GIT_URL#https://}@${NEOXRA_CORE_GIT_REF}"; \
    else \
        python -m pip install --no-build-isolation "neoxra-core @ git+${NEOXRA_CORE_GIT_URL}@${NEOXRA_CORE_GIT_REF}"; \
    fi

COPY . .

RUN python scripts/check_neoxra_core.py

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
