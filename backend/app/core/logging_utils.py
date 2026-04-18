import contextvars
import logging
import os
from typing import Optional


REQUEST_ID_CONTEXT: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id",
    default="-",
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = REQUEST_ID_CONTEXT.get("-")
        return True


def set_request_id(request_id: str) -> contextvars.Token[str]:
    return REQUEST_ID_CONTEXT.set(request_id)


def reset_request_id(token: contextvars.Token[str]) -> None:
    REQUEST_ID_CONTEXT.reset(token)


def get_request_id() -> str:
    return REQUEST_ID_CONTEXT.get("-")


def _coerce_log_level(value: Optional[str]) -> int:
    if not value:
        return logging.INFO
    return getattr(logging, value.upper(), logging.INFO)


def configure_logging() -> None:
    level = _coerce_log_level(os.getenv("LOG_LEVEL", "INFO"))
    root_logger = logging.getLogger()
    request_id_filter = RequestIdFilter()

    if not root_logger.handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s [%(name)s] [request_id=%(request_id)s] %(message)s",
        )

    root_logger.setLevel(level)

    for handler in root_logger.handlers:
        has_filter = any(isinstance(existing, RequestIdFilter) for existing in handler.filters)
        if not has_filter:
            handler.addFilter(request_id_filter)

