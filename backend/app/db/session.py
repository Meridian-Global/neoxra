from __future__ import annotations

import os
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def get_database_url() -> str | None:
    return os.getenv("DATABASE_URL") or None


def is_database_enabled() -> bool:
    return bool(get_database_url())


def _normalized_database_url() -> str:
    database_url = get_database_url()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured.")
    if database_url.startswith("postgres://"):
        return "postgresql://" + database_url.removeprefix("postgres://")
    return database_url


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    database_url = _normalized_database_url()
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(
        database_url,
        pool_pre_ping=True,
        future=True,
        connect_args=connect_args,
    )


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, expire_on_commit=False)


def create_session() -> Session:
    return get_session_factory()()


def check_database_connection() -> bool:
    if not is_database_enabled():
        return False
    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
    return True


def reset_database_state() -> None:
    get_engine.cache_clear()
    get_session_factory.cache_clear()
