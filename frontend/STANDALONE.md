## Status
This is a standalone demo UI for the Orchestra engine. It is not part
of the core package. Future apps (e.g., LinkedIn Chrome Extension)
will be separate repos that call the Orchestra API directly.

## API Dependency
This app depends on exactly one endpoint: POST /api/run
(see CORE_API.md at repo root). It streams SSE events to the browser.
It does not use /api/publish/linkedin or /api/ideas/scan.

## Running Locally
cd frontend && npm install && npm run dev
Set NEXT_PUBLIC_API_BASE in .env.local to point to the running backend.

## Future
This frontend may be extracted to its own repo in a later migration step.
