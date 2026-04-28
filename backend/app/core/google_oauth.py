"""Minimal Google OAuth2 helpers — token exchange and ID-token verification."""

from __future__ import annotations

import os

import requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token

_GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"


def _client_id() -> str:
    value = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not value:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured")
    return value


def _client_secret() -> str:
    value = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not value:
        raise RuntimeError("GOOGLE_CLIENT_SECRET is not configured")
    return value


def google_redirect_uri() -> str:
    frontend = os.getenv("FRONTEND_APP_URL", "http://localhost:3000").rstrip("/")
    return os.getenv("GOOGLE_REDIRECT_URI", f"{frontend}/login/google/callback").strip()


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange an authorization code for tokens via Google's token endpoint."""
    resp = requests.post(
        _GOOGLE_TOKEN_ENDPOINT,
        data={
            "code": code,
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def verify_google_id_token(raw_id_token: str) -> dict:
    """Verify a Google ID token and return the claims (email, name, sub)."""
    claims = google_id_token.verify_oauth2_token(
        raw_id_token,
        GoogleAuthRequest(),
        audience=_client_id(),
    )
    return {
        "email": claims["email"],
        "name": claims.get("name"),
        "sub": claims["sub"],
    }
