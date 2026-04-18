#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import platform
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.neoxra_core_diagnostics import (  # noqa: E402
    format_neoxra_core_diagnostics,
    get_neoxra_core_diagnostics,
)


def main() -> int:
    diagnostics = get_neoxra_core_diagnostics()

    print("== neoxra_core diagnostic check ==")
    print(f"cwd={os.getcwd()}")
    print(f"backend_root={BACKEND_ROOT}")
    print(f"python={sys.executable}")
    print(f"python_version={platform.python_version()}")
    print(json.dumps(diagnostics, indent=2, sort_keys=True))
    print(format_neoxra_core_diagnostics(diagnostics))

    return 0 if diagnostics.get("import_ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
