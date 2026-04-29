#!/usr/bin/env python3
"""Run auth session cleanup via the internal API.

Usage:
  NEOXRA_ADMIN_KEY=xxx NEOXRA_API_URL=https://api.neoxra.com python scripts/cleanup_auth.py
"""

import os
import sys

import requests


def main() -> None:
    api_url = os.getenv("NEOXRA_API_URL", "http://localhost:8000").rstrip("/")
    admin_key = os.getenv("NEOXRA_ADMIN_KEY", "")

    if not admin_key:
        print("Error: NEOXRA_ADMIN_KEY is required.", file=sys.stderr)
        sys.exit(1)

    url = f"{api_url}/api/internal/auth/cleanup"
    resp = requests.post(url, headers={"X-Neoxra-Admin-Key": admin_key}, timeout=30)

    if resp.status_code != 200:
        print(f"Error: {resp.status_code} — {resp.text}", file=sys.stderr)
        sys.exit(1)

    result = resp.json()
    print(f"Auth cleanup complete: {result}")


if __name__ == "__main__":
    main()
