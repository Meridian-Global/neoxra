#!/usr/bin/env bash
set -euo pipefail

echo "== Render build for Neoxra backend =="
echo "pwd=$(pwd)"
echo "python=$(command -v python)"

CORE_GIT_REF="${NEOXRA_CORE_GIT_REF:-main}"
CORE_GIT_URL="${NEOXRA_CORE_GIT_URL:-}"

if [[ -z "${CORE_GIT_URL}" ]]; then
  echo "NEOXRA_CORE_GIT_URL must be set to the private neoxra-core repository URL."
  exit 1
fi

if [[ "${CORE_GIT_URL}" == https://github.com/* ]]; then
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "GITHUB_TOKEN is required when NEOXRA_CORE_GIT_URL points to a private GitHub HTTPS repository."
    exit 1
  fi
  CORE_GIT_URL="https://x-access-token:${GITHUB_TOKEN}@${CORE_GIT_URL#https://}"
fi

CORE_INSTALL_SOURCE="neoxra-core @ git+${CORE_GIT_URL}@${CORE_GIT_REF}"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-prod.txt
python -m pip install --no-build-isolation "${CORE_INSTALL_SOURCE}"
python -m pip show neoxra-core || true
python -c "import neoxra_core; print('neoxra_core import ok:', neoxra_core.__file__)"
python scripts/check_neoxra_core.py
