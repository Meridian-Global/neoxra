#!/usr/bin/env bash
# Start script for Render — sets PLAYWRIGHT_BROWSERS_PATH so the runtime
# process finds the Chromium binary installed during build.
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/src/.playwright-browsers
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
