## Status

This frontend is a standalone demo surface for the Neoxra backend.
It is not the shared AI engine and it is not the future product shell.

Right now it serves two purposes:

- demo the original multi-platform pipeline UI
- demo the standalone Instagram generation UI

Both pages talk to the FastAPI backend over Server-Sent Events.

## Pages

### `/`

The root page is the original Neoxra demo.

It calls:

- `POST /api/run`

This flow streams the multi-agent pipeline:

- planner
- Instagram / Threads / LinkedIn passes
- critic
- final pipeline output

### `/instagram`

The Instagram page is the newer standalone content generation flow.

It calls:

- `POST /api/instagram/generate`

This flow streams:

- style analysis
- Instagram content generation
- scoring
- final Instagram result

## API dependency

This frontend currently depends on two backend endpoints:

- `POST /api/run`
- `POST /api/instagram/generate`

It does not call:

- `POST /api/publish/linkedin`
- `GET /api/ideas/scan`

Those are app-layer integration routes owned by the backend.

## Running locally

From the repo root, start the backend first:

```bash
source .venv/bin/activate
uvicorn neoxra.backend.main:app --reload
```

Then in a separate terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Available pages:

- `http://localhost:3000/`
- `http://localhost:3000/instagram`

## Manual test flow

### Multi-platform page

1. Open `http://localhost:3000/`
2. Enter an idea
3. Start the run
4. Confirm live SSE updates appear for planner, platform passes, critic, and final outputs

### Instagram page

1. Open `http://localhost:3000/instagram`
2. Fill in topic and template text
3. Choose a goal
4. Click `Generate Post System`
5. Confirm progressive rendering of:
   - style analysis
   - generated content
   - scorecard
   - carousel deck / critique

If the backend emits an SSE error event, the page should render an error banner instead of silently failing.

## Automated tests

Run frontend tests:

```bash
cd frontend
npm test -- --runInBand
```

Run a production build check:

```bash
cd frontend
npm run build
```

## Notes

- This frontend is a demo client for the Neoxra backend, not the core AI package
- Backend generation still depends on `neoxra-core` being installed and configured correctly
- `NEXT_PUBLIC_API_BASE_URL` must point to the running backend or the UI will fail to stream
- The Instagram page is the most actively evolving surface right now

## Future

This frontend may still be extracted into its own repo later.
For now, it lives here because it is tightly coupled to the current backend routes and developer workflow.
