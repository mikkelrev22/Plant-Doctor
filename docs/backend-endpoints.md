# Backend API Endpoints

This document lists the available API endpoints for the Node backend in the monorepo (`apps/backend`, Fastify).

## Base URL

Default: `http://localhost:4100` (env `PORT` / `HOST` / `BACKEND_URL`).

## Route groups

Routes are organized into **consumer groups** under `apps/backend/src/app/routes/<group>/`, each registered in `app.ts` inside its own `fastify.register` scope. Each scope is the hook point for a per-group `preHandler` authorization middleware. Existing URLs are unchanged; only the `agent` group (a new namespace) is URL-prefixed.

- **`public`** — no auth. Health/version probe.
- **`consumer`** — the user-facing `mobile-app`. Also called by the `dashboard` (which is a superset: it uses these routes *plus* the `admin` ones).
- **`admin`** — the `dashboard` (LLM eval platform) and the `architecture` browser app. Internal/admin-only extras.
- **`agent`** — the `backend-py` (Python LangGraph) microservice, which retrieves DB data through these endpoints as a gateway instead of reading the DB directly. Mounted under `/agent`. Requires a per-chat `x-chat-token` header (see Auth).

## Auth

All routes require an `x-api-key` header matching `BACKEND_API_KEY`, **except** `OPTIONS`, `GET /`, and any path under `/uploads/`. A missing, wrong, or empty key fails closed with **401 Unauthorized**. See `apps/backend/src/app/plugins/api-key.ts`.

The global api-key gate is a stopgap shared by every consumer; it is **not** per-consumer authorization. Per-group auth hooks will be attached at each route group's `register` scope in `app.ts`. The `agent` group is the first to wire one: a `preHandler` (`apps/backend/src/app/services/agent-auth.ts`) validates an `x-chat-token` header against the `chats` table and attaches the resolved chat row to `request.chat`, scoping every tool query to that chat's plant/user. A missing or invalid token fails closed with **401 Unauthorized**. Only `POST /agent/chats` opts out (via route config `requireChatToken: false`) — it mints the token, so it can't present one yet.

---

## public

### GET /
Health/version probe. API-key-exempt.
- **Response**: `{ "message": "Node.js backend is running", "version": "<BACKEND_VERSION>" }`

---

## consumer (mobile-app)

Used by the `mobile-app`. The `dashboard` also calls all of these.

### GET /plants
Lists preview plants for the Research User dropdown.
- **Response**: Array of plant objects from the database.

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
Returns report history for one plant, including per-report stress-sign evaluations (used by the over-time stress-sign table and by the mobile app's report list to render stress-sign dots before a report is opened).
- **Parameters**: `plantId` (integer)
- **Response**: Extended report array with stress-sign evaluation data.

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

## admin (dashboard + architecture)

Admin/internal extras used by the `dashboard` (LLM eval platform) and the `architecture` browser app. The `dashboard` also uses every `consumer` route above.

### GET /plants/evals
Extended plant list for the eval tool: same fields as `GET /plants` plus a `models` array containing the distinct LLM model names used across each plant's reports.
- **Response**: Array of plant objects with an extra `models` field.
- **Note**: Registered via the admin group, which `app.ts` registers **before** the consumer group, preserving the static-before-parametric guard so `/plants/evals` is not shadowed by `/plants/:plantId`. Intended to be disable-able in production independently.

### GET /plants/:plantId/reports/eval
Returns report history for one plant, including per-report stress-sign evaluations **and LLM metrics** (latency, token usage, model, error) parsed from each `llm_requests` row. Powers the eval results table.
- **Parameters**: `plantId` (integer)
- **Response**: Eval report array with stress-sign evaluation data and LLM metrics.

### GET /llm-requests/:llmRequestId
Returns the full LLM request log for one request, including prompt, response, and request/response metadata. Used by the report page's technical request-log table.
- **Parameters**: `llmRequestId` (integer)
- **Response**: LLM request object or 404 if not found.

### GET /stress-signs
Returns the seeded stress checklist and the stress-variable taxonomy (nutrients, water, light, etc.).
- **Response**: Array of stress-sign objects, each with nested `variables`.

### GET /config/llm
Read-only live LLM config so the dashboard can show the current model. Returns only non-sensitive values — no keys, URLs, or credentials.
- **Response**: `{ "model": "<config.llmApiModel>" }`

### Architecture

Used by the `apps/architecture` browser app to read/write the hand-edited architecture diagram stored in `docs/architecture.json`.

#### GET /architecture/graph
Loads the architecture diagram from `docs/architecture.json`.
- **Response**: `{ "nodes": [...], "edges": [...] }`. Returns `{ "nodes": [], "edges": [] }` if the file does not yet exist (ENOENT).

#### PUT /architecture/graph
Overwrites `docs/architecture.json` with the provided body (creates the directory tree if needed).
- **Body**: `{ "nodes": [...], "edges": [...] }`
- **Response**: `{ "ok": true, "nodes": <count>, "edges": <count> }`
- **Errors**: 400 if the body is not an object with `nodes` and `edges` arrays.

---

## agent (`/agent`)

The `backend-py` (Python LangGraph) microservice retrieves DB data through these endpoints as a gateway instead of reading the DB directly. All URLs are prefixed with `/agent`. Every route requires an `x-chat-token` header (validated by the group `preHandler` against the `chats` table), **except** `POST /agent/chats`, which mints the token. The token is an opaque handle (a `crypto.randomUUID`), not the numeric chat row id — internal DB ids are never exposed to the agent. Plant and report ids *are* passed numerically; they are always re-authorized via the chat token's user before any query runs. Tokens do not expire or invalidate — a user may resume a chat later.

Chats are scoped to a single plant (the chat's default plant) and carry the latest report at creation time as initial context. Chat history is stored as a single opaque `history` jsonb blob on the `chats` row, written wholesale by `saveChat` and returned as-is by `getChat` (the agent owns its message-array shape). Tool results are returned as **plain text** (`text/plain; charset=utf-8`), formatted server-side — the agent works in natural language and never receives structured JSON for tool output. Every call is logged to an `agent_events` table (tool name, request params, truncated response text, latency, error); `lookAtPhoto` additionally logs an `llm_requests` row.

### POST /agent/chats
Creates a chat for a plant, gathers the plant + latest report as plain-text context to start the session, and mints the chat token. No `x-chat-token` required (this is the route that creates it).
- **Body**: `{ "plantId": <integer> }`
- **Response**: `{ "chatToken": "<uuid>", "contextText": "<plain text>", "plantId": <integer>, "plantName": "<string>", "defaultReportId": <integer | null> }` — `defaultReportId` is the latest report's id at creation (null if the plant has no reports yet); `contextText` summarizes the plant and its latest report so the agent can begin without an extra tool call.
- **Errors**: 404 if the plant does not belong to the Research User.

### GET /agent/chats/:chatToken
Returns the saved chat history blob so the agent can resume.
- **Parameters**: `chatToken` (string)
- **Response**: `{ "chatToken": "<string>", "plantId": <integer>, "plantName": "<string>", "defaultReportId": <integer | null>, "history": <opaque blob>, "createdAt": "<iso>", "updatedAt": "<iso>" }`
- **Errors**: 404 if the chat is not found. (An invalid `chatToken` is rejected by the `preHandler` with 401 before reaching the handler.)

### PUT /agent/chats/:chatToken
Overwrites the conversation JSON blob for the chat.
- **Parameters**: `chatToken` (string)
- **Body**: `{ "history": <opaque blob> }` — the agent's full message array, stored as-is.
- **Response**: `204 No Content`
- **Errors**: 404 if the chat is not found.

### GET /agent/plantReports
Returns the last 3 reports for the chat's plant with full detail (dates, summary, present/absent stress signs with severity and notes), plus a final "N more report(s) in this plant's history" note when there are more. Plain text.
- **Query**: `plantId` (integer, optional) — defaults to the chat's bound plant; must belong to the chat's user.
- **Errors**: 404 if the plant is not found / not owned by the chat's user.

### GET /agent/plantHistory
Returns every report for the plant, briefly (dates, summary, stress signs without notes). Plain text.
- **Query**: `plantId` (integer, optional) — defaults to the chat's bound plant.
- **Errors**: 404 if the plant is not found / not owned.

### GET /agent/userPlants
Returns the user's plants (capped at 10): name, species, report count, and current (latest-report) stress signs. Plain text.
- **Response**: Plain text; "No plants found on this account." when empty.

### POST /agent/lookAtPhoto
Answers a free-text question about a report's photo using the vision LLM. Defaults to the chat's default report. Plain text.
- **Body**: `{ "reportId": <integer, optional>, "query": <non-empty string> }` — `reportId` defaults to the chat's `defaultReportId`.
- **Response**: Plain text — the LLM's answer to the query about the photo.
- **Errors**: 400 if `query` is missing; 404 if the report (or its photo) is not found; 502 Bad Gateway (`Look-at-photo failed`, generic message to the client with the full error logged server-side) if the LLM call fails.

---

## Static Files

### GET /uploads/plant-photos/*
Serves uploaded plant photos. API-key-exempt (browser `<img>` tags can't attach headers).
- **Example**: `/uploads/plant-photos/abcd-1234.jpg`
- **Note**: Only mounted when `STORAGE_DRIVER=local` (default). With `STORAGE_DRIVER=s3`, uploads are served directly from the bucket's public URLs and this route is not registered.