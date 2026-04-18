#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required to install neoxra_core from the private core repository."
  exit 1
fi

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install "neoxra-core @ git+https://x-access-token:${GITHUB_TOKEN}@github.com/Meridian-Global/orchestra-core.git@main"
python -c "import neoxra_core; print('neoxra_core import ok:', neoxra_core.__file__)"
