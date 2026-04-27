#!/usr/bin/env bash
# Start script for Render.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
