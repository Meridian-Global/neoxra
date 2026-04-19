from __future__ import annotations

import os
from functools import lru_cache

from .base import CoreClient
from .http import HttpCoreClient
from .local import LocalCoreClient

DEFAULT_CORE_CLIENT_MODE = "local"
SUPPORTED_CORE_CLIENT_MODES = {"local", "http"}


def get_core_client_mode() -> str:
    raw = os.getenv("NEOXRA_CORE_CLIENT_MODE", DEFAULT_CORE_CLIENT_MODE).strip().lower()
    return raw if raw in SUPPORTED_CORE_CLIENT_MODES else DEFAULT_CORE_CLIENT_MODE


@lru_cache(maxsize=1)
def get_core_client() -> CoreClient:
    mode = get_core_client_mode()
    if mode == "http":
        return HttpCoreClient(base_url=os.getenv("NEOXRA_CORE_API_BASE_URL", ""))
    return LocalCoreClient()


def reset_core_client_cache() -> None:
    get_core_client.cache_clear()

