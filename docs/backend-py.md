# Backend API Endpoints — Python (`backend-py`)

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
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "image_url": "https://example.com/plant.jpg",
    "user_text": "Yellowing leaves near a south-facing window."
  }
  ```
- **Response**:
  ```json
  {
    "result": {
      "image_url": "...",
      "user_text": "...",
      "triage": { "is_plant": true, "structured_facts": { ... } },
      "symptom_report": { "species": "...", "symptoms": [], "confidence": 0.0 },
      "care_profile": { "species": "...", "ideal_conditions": {}, "common_failure_modes": [] },
      "diagnosis": { "species": "...", "symptoms": [], "candidate_causes": [] },
      "advice": { "summary": "...", "actions": ["..."] }
    }
  }
  ```
- **Primary output**: `result.advice` (`summary` + `actions`)

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