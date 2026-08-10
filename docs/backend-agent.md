# Agent Service — Python (`backend-agent`)

FastAPI + LangGraph service that runs the **pluggable plant-care agent** and streams
its output to the mobile app using the **AI SDK UI Message Stream** protocol
(the same protocol `useChat` from `@ai-sdk/react` consumes). It is intentionally a
**minimal reference draft** — a clean example for the `backend-py` owner to learn
from — and the first service to actually wire the Node `/agent` tool gateway
documented in [`agent-integration.md`](./agent-integration.md).

`backend-py` is unrelated to this app and is left untouched.

## Base URL

Default: `http://localhost:4300` (`BACKEND_AGENT_URL` / `BACKEND_AGENT_PORT` in `.env`).

Requires the Node backend running at `BACKEND_URL` (default `http://localhost:4100`)
with a matching `BACKEND_API_KEY`, and `LLM_API_*` for the model. Without an
`LLM_API_KEY`, the agent runs in a placeholder mode (returns a stub message) so the
wiring can be exercised end-to-end.

## Architecture

```
mobile-app (useChat)  ── POST /chat/agent/stream ──▶  backend-agent (LangGraph)
                                                        │ mints chatToken via Node POST /agent/chats
                                                        │ ReAct loop: agent ↔ 4 gateway tools
                                                        │ astream_events → AI SDK SSE parts
                                                        ▼
                                              Node backend /agent/* (tool gateway, unchanged)
```

The **AI SDK UI Message Stream is the agent-agnostic contract.** Swapping or
A/B-testing agents = pointing `EXPO_PUBLIC_AGENT_URL` at a different service that
emits the same protocol; the mobile UI is unchanged.

## Root

### GET /
Health check.
- **Response**: `{ "message": "Plant Doctor agent service is running" }`

### GET /chat/health
Lightweight liveness probe.
- **Response**: `{ "status": "ok" }`

---

## Chat (streaming)

### POST /chat/agent/stream
Runs the ReAct agent and streams the AI SDK UI Message Stream (SSE).

- **Content-Type**: `application/json`
- **Headers**: `x-api-key: <BACKEND_API_KEY>` (service-level gate, same key the
  mobile app already uses for the Node backend)
- **Body**:
  ```json
  {
    "plant_id": 1,
    "message": "What's wrong with my aloe?",
    "thread_id": "optional-uuid-to-resume-a-previous-chat"
  }
  ```
  On the first turn (no `thread_id`), the server calls Node `POST /agent/chats`
  to mint an opaque `chatToken` and seeds the agent with the plant's
  `contextText`. On resume, the `chatToken` is recovered from the LangGraph
  checkpointer.

- **Response**: `text/event-stream` with header
  `x-vercel-ai-ui-message-stream: v1`. Each event is a `data: <json>\n\n` line,
  terminated by `data: [DONE]\n\n`. Part types emitted:

  | Part type | When | Purpose |
  |-----------|------|---------|
  | `start` | once, first | message start (`messageId`) |
  | `data-thread` | once, near start | `{ thread_id, chat_token, plant_id, plant_name, default_report_id }` — client persists `thread_id` to resume |
  | `start-step` / `finish-step` | per LLM call | step lifecycle |
  | `text-start` / `text-delta` / `text-end` | per token | streaming assistant text (`id` ties a block together) |
  | `tool-input-start` / `tool-input-available` | tool starts | tool-progress cards (`toolName`) |
  | `tool-output-available` | tool ends | tool result (`output`) |
  | `data-yesno` | `ask_yes_no` tool | interactive Yes/No buttons (`{ prompt, id }`) |
  | `finish` | end | `finishReason`, `usage` |
  | `error` | on failure | `errorText` |
  | `[DONE]` | always last | stream terminator (emitted even on error) |

  > The `finish` / `usage` field shape is the part most likely to need a tweak
  > if `useChat` rejects the stream — confirm against a JS
  > `createUIMessageStreamResponse` capture.

- **Resume**: store `thread_id` from the `data-thread` part and send it back on
  follow-up turns. Conversation state lives in the in-process `MemorySaver`
  checkpointer (lost on restart — swap in `AsyncSqliteSaver` /
  `AsyncPostgresSaver` to persist; see `backend-py`'s `persistence.py`).

### Agent tools (internal)
The ReAct agent binds these tools (called during a run, not separate endpoints):

- `get_recent_reports` — last 3 reports, full detail (Node `GET /agent/plantReports`)
- `get_report_history` — every report, brief (Node `GET /agent/plantHistory`)
- `list_user_plants` — the user's plants (Node `GET /agent/userPlants`)
- `look_at_photo` — vision Q&A on a report photo (Node `POST /agent/lookAtPhoto`)
- `ask_yes_no` — emits a `data-yesno` interactive part and returns; the user's
  choice arrives as their next message. **This is the demo of the `data-*`
  custom-part pattern** — `data-questionnaire` and `data-photo-request` would
  follow the identical mechanism (a tool/node calling `get_stream_writer()` with
  a `{"type": "<name>", ...}` payload).

`chat_token` is threaded into the tools per request via the `RunnableConfig`'s
`configurable` dict and read with `ensure_config()`, so the model never sees it.

## Example

```bash
curl -N -X POST http://localhost:4300/chat/agent/stream \
  -H "x-api-key: $BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"plant_id": 1, "message": "what is wrong with my plant?"}'
```

## Run / test

```bash
npx nx serve backend-agent                       # or: uv run python -m backend_agent
npx nx test backend-agent                        # uv run pytest tests/
npx nx lint backend-agent                        # ruff
```