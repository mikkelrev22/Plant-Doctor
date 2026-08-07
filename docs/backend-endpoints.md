# Backend API Endpoints

This document lists the available API endpoints for the Node backend in the monorepo (`apps/backend`, Fastify).

## Base URL

Default: `http://localhost:4100` (env `PORT` / `HOST` / `BACKEND_URL`).

## Auth

All routes require an `x-api-key` header matching `BACKEND_API_KEY`, **except** `OPTIONS`, `GET /`, and any path under `/uploads/`. A missing, wrong, or empty key fails closed with **401 Unauthorized**. See `apps/backend/src/app/plugins/api-key.ts`.

---

## Root

### GET /
Health/version probe. API-key-exempt.
- **Response**: `{ "message": "Node.js backend is running", "version": "<BACKEND_VERSION>" }`

---

## Plants

### GET /plants
Lists preview plants for the Research User dropdown.
- **Response**: Array of plant objects from the database.

### GET /plants/evals
Extended plant list for the eval tool: same fields as `GET /plants` plus a `models` array containing the distinct LLM model names used across each plant's reports.
- **Response**: Array of plant objects with an extra `models` field.
- **Note**: Registered before the parametric `/plants/:plantId` so the static path isn't shadowed. Intended to be disable-able in production independently.

### POST /plants
Creates a plant for the Research User. If no name is provided, a friendly name is generated.
- **Body**: `{ "name": "string" }` (optional)
- **Response**: The created plant object.

### GET /plants/:plantId
Returns a single plant by ID.
- **Parameters**: `plantId` (integer)
- **Response**: Plant object or 404 if not found.

### PATCH /plants/:plantId
Updates a plant's editable fields (`name` and/or `notes`).
- **Parameters**: `plantId` (integer)
- **Body**: `{ "name": "string" (min length 1) }` and/or `{ "notes": "string" | null }` — at least one field must be present. `notes: null` clears the notes.
- **Response**: The updated plant object.
- **Errors**: 400 if neither `name` nor `notes` is provided.

### GET /plants/:plantId/reports
Returns the report history for a specific Research User plant.
- **Parameters**: `plantId` (integer)
- **Response**: Array of report summaries for the specified plant.

### GET /plants/:plantId/reports/extended
Returns report history for one plant, including per-report stress-sign evaluations (used by the over-time stress-sign table).
- **Parameters**: `plantId` (integer)
- **Response**: Extended report array with stress-sign evaluation data.

### GET /plants/:plantId/reports/eval
Returns report history for one plant, including per-report stress-sign evaluations **and LLM metrics** (latency, token usage, model, error) parsed from each `llm_requests` row. Powers the eval results table.
- **Parameters**: `plantId` (integer)
- **Response**: Eval report array with stress-sign evaluation data and LLM metrics.

---

## Reports

### GET /reports/:reportId
Returns a full report including photo details, stress checklist, and LLM log summary.
- **Parameters**: `reportId` (integer)
- **Response**: Detailed report object or 404 if not found.

### POST /reports/analyze
Uploads a plant image, requests an LLM diagnosis, logs the request, and stores the resulting report.
- **Content-Type**: `multipart/form-data` (max 1 file, ≤10 MB each)
- **Fields**:
  - `image` (file, required): The plant photo to analyze.
  - `plantId` (string, optional): ID of an existing plant.
  - `plantName` (string, optional): Name for a new or existing plant.
  - `process` (string, optional): When `true` (default), the image is resized to a vision-friendly size and converted to JPEG before being sent to the LLM. Set to `false` (or `"0"`) to send the raw uploaded image.
  - `capturedAt` (string, optional): EXIF capture time from the mobile client, as an ISO 8601 string.
  - `temperature` (number, optional, 0–2): Eval override; defaults to `0.05` when omitted (logged in request metadata).
  - `reasoningEffort` (string, optional, one of `reasoningEffortLevels`): Eval override; defaults to `'none'` when omitted (logged in request metadata).
- **Response**: `{ "plant": { ... }, "report": { ... } }`
- **Errors**: 400 `A plant image is required` if no `image` part; 502 Bad Gateway (`Plant analysis failed`, generic message to the client with the full error logged server-side) if LLM analysis fails.
- **Note**: Plant rename only happens for plants created in this request; species is set once and never overwritten.

---

## LLM Requests

### GET /llm-requests/:llmRequestId
Returns the full LLM request log for one request, including prompt, response, and request/response metadata. Used by the report page's technical request-log table.
- **Parameters**: `llmRequestId` (integer)
- **Response**: LLM request object or 404 if not found.

---

## Stress Signs

### GET /stress-signs
Returns the seeded stress checklist and the stress-variable taxonomy (nutrients, water, light, etc.).
- **Response**: Array of stress-sign objects, each with nested `variables`.

---

## Architecture

Used by the `apps/architecture` browser app to read/write the hand-edited architecture diagram stored in `docs/architecture.json`.

### GET /architecture/graph
Loads the architecture diagram from `docs/architecture.json`.
- **Response**: `{ "nodes": [...], "edges": [...] }`. Returns `{ "nodes": [], "edges": [] }` if the file does not yet exist (ENOENT).

### PUT /architecture/graph
Overwrites `docs/architecture.json` with the provided body (creates the directory tree if needed).
- **Body**: `{ "nodes": [...], "edges": [...] }`
- **Response**: `{ "ok": true, "nodes": <count>, "edges": <count> }`
- **Errors**: 400 if the body is not an object with `nodes` and `edges` arrays.

---

## Config

### GET /config/llm
Read-only live LLM config so the dashboard can show the current model. Returns only non-sensitive values — no keys, URLs, or credentials.
- **Response**: `{ "model": "<config.llmApiModel>" }`

---

## Static Files

### GET /uploads/plant-photos/*
Serves uploaded plant photos. API-key-exempt (browser `<img>` tags can't attach headers).
- **Example**: `/uploads/plant-photos/abcd-1234.jpg`
- **Note**: Only mounted when `STORAGE_DRIVER=local` (default). With `STORAGE_DRIVER=s3`, uploads are served directly from the bucket's public URLs and this route is not registered.