#!/usr/bin/env bash
set -euo pipefail

echo "== Render build for Neoxra backend =="
echo "pwd=$(pwd)"
echo "python=$(command -v python)"

CORE_GIT_REF="${NEOXRA_CORE_GIT_REF:-main}"
CORE_GIT_URL="${NEOXRA_CORE_GIT_URL:-https://github.com/Meridian-Global/neoxra-core.git}"
echo "core_git_ref=${CORE_GIT_REF}"
echo "core_git_url=${CORE_GIT_URL}"

if [[ "${CORE_GIT_URL}" == https://github.com/* ]]; then
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "GITHUB_TOKEN is required when using a private GitHub HTTPS repository for neoxra_core."
    exit 1
  fi
  CORE_GIT_URL="https://x-access-token:${GITHUB_TOKEN}@${CORE_GIT_URL#https://}"
fi

CORE_INSTALL_SOURCE="neoxra-core @ git+${CORE_GIT_URL}@${CORE_GIT_REF}"
echo "core_install_source=${CORE_INSTALL_SOURCE}"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
python -m pip install --no-build-isolation "${CORE_INSTALL_SOURCE}"
python -m pip show neoxra-core
python -c "import neoxra_core; print(neoxra_core.__file__)"
python -c "import neoxra_core.models.context, neoxra_core.models.outputs, neoxra_core.voice; print('deep imports ok')"
python scripts/check_neoxra_core.py
