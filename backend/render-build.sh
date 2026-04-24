#!/usr/bin/env bash
set -euo pipefail

echo "== Render build for Neoxra backend =="
echo "pwd=$(pwd)"
echo "python=$(command -v python)"

CORE_GIT_REF="${NEOXRA_CORE_GIT_REF:-main}"
CORE_GIT_URL="${NEOXRA_CORE_GIT_URL:-https://github.com/Meridian-Global/neoxra-core.git}"
echo "core_git_ref=${CORE_GIT_REF}"
echo "core_git_url=${CORE_GIT_URL}"

RENDERER_GIT_REF="${NEOXRA_RENDERER_GIT_REF:-main}"
RENDERER_GIT_URL="${NEOXRA_RENDERER_GIT_URL:-https://github.com/Meridian-Global/neoxra-renderer.git}"
echo "renderer_git_ref=${RENDERER_GIT_REF}"
echo "renderer_git_url=${RENDERER_GIT_URL}"

if [[ "${CORE_GIT_URL}" == https://github.com/* ]]; then
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "GITHUB_TOKEN is required when using a private GitHub HTTPS repository for neoxra_core."
    exit 1
  fi
  CORE_GIT_URL="https://x-access-token:${GITHUB_TOKEN}@${CORE_GIT_URL#https://}"
fi

if [[ "${RENDERER_GIT_URL}" == https://github.com/* ]] && [[ -n "${GITHUB_TOKEN:-}" ]]; then
  RENDERER_GIT_URL="https://x-access-token:${GITHUB_TOKEN}@${RENDERER_GIT_URL#https://}"
fi

CORE_INSTALL_SOURCE="neoxra-core @ git+${CORE_GIT_URL}@${CORE_GIT_REF}"
RENDERER_INSTALL_SOURCE="neoxra-renderer @ git+${RENDERER_GIT_URL}@${RENDERER_GIT_REF}"
echo "core_install_source=${CORE_INSTALL_SOURCE}"
echo "renderer_install_source=${RENDERER_INSTALL_SOURCE}"

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
python -m pip install --no-build-isolation "${CORE_INSTALL_SOURCE}"
python -m pip install --no-build-isolation "${RENDERER_INSTALL_SOURCE}"

python -m pip show neoxra-core
python -c "import neoxra_core; print(f'neoxra_core_import=ok path={neoxra_core.__file__}')"
python -c "import neoxra_core.models.context, neoxra_core.models.outputs, neoxra_core.voice; print('neoxra_core_deep_imports=ok')"
python scripts/check_neoxra_core.py

# Install Playwright Chromium for server-side rendering.
# Install to the exact default path Playwright uses at runtime on Render,
# so no extra env var is needed.
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright
echo "== Installing Playwright Chromium to ${PLAYWRIGHT_BROWSERS_PATH} =="
mkdir -p "${PLAYWRIGHT_BROWSERS_PATH}"
python -m playwright install chromium
echo "== Playwright browser installed =="
ls -R "${PLAYWRIGHT_BROWSERS_PATH}/" | head -30
# Verify the headless shell binary exists
find "${PLAYWRIGHT_BROWSERS_PATH}" -name "chrome-headless-shell" -type f || echo "WARNING: chrome-headless-shell not found"
python -c "import neoxra_renderer; print(f'neoxra_renderer_import=ok path={neoxra_renderer.__file__}')"
