# Backend API Endpoints

This document lists the available API endpoints for both backends in the monorepo.

| Backend | Stack | Default URL |
|---------|-------|-------------|
| Node (`backend`) | Fastify | `http://localhost:4100` |
| Python (`backend-py`) | FastAPI + LangGraph | `http://localhost:4200` |

---

# Node backend (Fastify)

## Base URL

Default: `http://localhost:4100`

## Root

### GET /
Returns a simple message confirming the backend is running.
- **Response**: `{ "message": "Node.js backend is running" }`

---

## Plants

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
Updates a plant's name.
- **Parameters**: `plantId` (integer)
- **Body**: `{ "name": "string" }` (required, min length 1)
- **Response**: The updated plant object.

### GET /plants/:plantId/reports
Returns the report history for a specific Research User plant.
- **Parameters**: `plantId` (integer)
- **Response**: Array of report summaries for the specified plant.

### GET /plants/:plantId/reports/extended
Returns report history for one plant, including per-report stress-sign evaluations (used by the over-time stress-sign table).
- **Parameters**: `plantId` (integer)
- **Response**: Extended report array with stress-sign evaluation data.

---

## Reports

### GET /reports/:reportId
Returns a full report including photo details, stress checklist, and LLM log summary.
- **Parameters**: `reportId` (integer)
- **Response**: Detailed report object or 404 if not found.

### POST /reports/analyze
Uploads a plant image, requests an LLM diagnosis, logs the request, and stores the resulting report.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `image` (file, required): The plant photo to analyze.
  - `plantId` (string, optional): ID of an existing plant.
  - `plantName` (string, optional): Name for a new or existing plant.
  - `process` (string, optional): When `true` (default), the image is resized to a vision-friendly size and converted to JPEG before being sent to the LLM. Set to `false` to send the raw uploaded image.
- **Response**: `{ "plant": { ... }, "report": { ... } }`
- **Errors**: 502 Bad Gateway if LLM analysis fails.

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
- **Response**: Object containing stress signs and their associations.

---

## Static Files

### GET /uploads/plant-photos/*
Serves uploaded plant photos.
- **Example**: `/uploads/plant-photos/abcd-1234.jpg`

---

# Python backend (`backend-py`)

FastAPI service that exposes two LangGraph orchestrations: a deterministic linear pipeline and a non-deterministic ReAct agent. Both share the same underlying capabilities in `apps/backend-py/src/backend_py/capabilities/`.

## Base URL

Default: `http://localhost:4200` (`BACKEND_PY_URL` in `.env`)

The frontend calls this backend from `/diagnose` (linear) and `/agent` (chat).

## Root

### GET /
Health check.
- **Response**: `{ "message": "Python backend is running" }`

---

## Linear diagnosis

### POST /diagnose/linear
Runs the deterministic pipeline: triage → vision → retrieval → diagnosis → formatting.
- **Content-Type**: `application/json` or `multipart/form-data`
- **JSON body**:
  ```json
  {
    "image_url": "https://example.com/plant.jpg",
    "user_text": "Leaves yellowing from the tips after I moved it.",
    "plant_id": 1,
    "plant_name": "Sunny Pothos",
    "care": {
      "light_intensity": "bright_indirect",
      "window_direction": "south",
      "distance_from_window": "within_3ft",
      "daily_light_hours": "6_to_8h",
      "water_amount": "moderate",
      "watering_frequency": "weekly",
      "water_type": "tap",
      "watering_method": "top",
      "soil_moisture": "slightly_moist",
      "soil_drainage": "good",
      "humidity": "average",
      "temperature": "room"
    }
  }
  ```
- **Multipart fields**:
  - `care` fields (required): `light_intensity`, `window_direction`, `distance_from_window`, `daily_light_hours`, `water_amount`, `watering_frequency`, `water_type`, `watering_method`, `soil_moisture`, `soil_drainage`, `humidity`, `temperature` (use `unknown` when the user is not sure). Plants are assumed indoors; location is not collected.
  - `user_text` / `comments` (optional free-text notes)
  - `image` (file) or `image_url` (string)
  - `plant_id`, `plant_name` (optional): when set, the `persist` step resolves the plant via the Node backend (`GET/POST /plants`). Report row save waits on a Node from-linear endpoint (see gaps below).
- **Response**: `{ "result": { ... } }` — primary output is `result.advice`; `result.persisted` describes DB save status; `result.care` / `result.triage.structured_facts` echo the form

### POST /diagnose/linear/stream
Same input as `/diagnose/linear`, but streams Server-Sent Events as each pipeline node completes.
- **Events**: `status` → `step` (includes `partial` accumulated state) → `done` or `error`
- **Steps**: triage → (if plant) vision → retrieval → diagnosis → format → persist; if not a plant, `reject_non_plant` returns graceful `advice` and ends
- **Primary output**: final `result` in the `done` event; when rejected, `result.rejected` is true and `result.advice` explains next steps

### Node backend integration (Python → Node)
Python calls Node at `BACKEND_URL` (default `http://localhost:4100`) via `NodeBackendClient` for plant CRUD and (when available) report/photo writes. Uploaded photos are still stored under `/uploads/plant-photos/` on Python until Node has an upload-only endpoint.

---

## ReAct agent

### POST /chat/agent
Runs the non-deterministic ReAct agent graph (agent ↔ tools loop). Supports multi-turn conversation via `thread_id` and a checkpointer for resume.
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "message": "My pothos has brown spots on the leaves.",
    "thread_id": "optional-uuid-for-follow-up-turns"
  }
  ```
- **Response**:
  ```json
  {
    "thread_id": "uuid",
    "result": {
      "messages": [
        { "role": "human", "content": "..." },
        { "role": "ai", "content": "..." },
        { "role": "tool", "content": "..." }
      ]
    }
  }
  ```
- **Multi-turn**: Omit `thread_id` on the first message; reuse the returned `thread_id` on follow-up requests.
- **Primary output**: Last `ai` message in `result.messages`
- **Errors**: 502 Bad Gateway if the agent run fails (e.g. LLM connection error)

### Agent tools (internal)
The agent can call these tools during a run (not separate HTTP endpoints):
- `analyze_plant_image` — vision analysis
- `lookup_plant_care` — RAG retrieval for species care profile
- `ask_user` — suspend and ask a clarifying question (resume with same `thread_id`)
