# Agent API Integration Guide

This document is the integration contract for the **`/agent`** HTTP endpoints on the
Node backend (`apps/backend`, Fastify). It is written for engineers — and coding
agents assisting engineers — who are implementing the **Python LangGraph agent** in
`apps/backend-py` that consumes these endpoints as its data gateway.

The agent does **not** read the database directly. It reaches plant/report data
through these HTTP endpoints, scoped per chat by an opaque **chat token**. Tool
results come back as **plain text** (the backend formats them); only chat
lifecycle calls return JSON.

> For the full backend route inventory (consumer/admin/public groups), see
> [`backend-endpoints.md`](./backend-endpoints.md). This document expands only the
> `agent` group with the detail an integrator needs.

---

## 1. Architecture

```
 mobile-app / dashboard           backend-py (LangGraph)              Node backend (Fastify)
 ──────────────────────          ────────────────────────             ────────────────────────
 POST /agent/chats  ───────────▶  createChat()           ── HTTP ──▶  /agent/*  (this API)
   (mints chat token)             holds chat_token + tools             DB gateway (Drizzle/Postgres)
                                  calls /agent/* tools
                                  saveChat() / getChat()
```

- The **mobile app** (or dashboard) calls `POST /agent/chats` once with a `plantId`
  to start a chat. The backend validates the plant, captures the latest report as
  initial context, mints an opaque `chatToken` (a UUID), and returns it together
  with a plain-text summary of the plant + its latest report.
- The app hands `chatToken` + `contextText` to the **LangGraph agent** (`backend-py`).
- The agent calls the **four tool endpoints** (`plantReports`, `plantHistory`,
  `userPlants`, `lookAtPhoto`) over HTTP, presenting `chatToken` as the
  `x-chat-token` header on every call. The backend re-authorizes every query
  against the chat's user/plant before running it.
- The agent persists its own conversation state by calling `PUT /agent/chats/:chatToken`
  (`saveChat`) and resumes via `GET /agent/chats/:chatToken` (`getChat`). The
  backend stores the history as an opaque blob — the agent owns its message-array
  shape.

### Why a chat token instead of an internal id

The chat handle is an **opaque token** (`crypto.randomUUID`), never the numeric
`chats.id`. Internal DB ids for chats are not exposed to the agent. **Plant and
report ids *are* passed numerically** — they are re-authorized through the chat
token's user before any query runs, so the agent may freely reference them.

---

## 2. Conventions

### Base URL

`http://localhost:4100` by default (env `PORT` / `HOST` / `BACKEND_URL`). All
agent URLs are prefixed with `/agent`.

### Authentication — two headers

| Header         | Required by            | Purpose                                                                 |
| -------------- | ---------------------- | ----------------------------------------------------------------------- |
| `x-api-key`    | **every** `/agent` route | Shared static key (`BACKEND_API_KEY`). Stopgap service-level gate.      |
| `x-chat-token` | every route **except** `POST /agent/chats` | The opaque chat token; scopes the call to one chat's plant/user. |

- The `x-api-key` gate runs first (`onRequest`). A missing/empty/wrong key returns
  **401** for all non-exempt paths.
- The `x-chat-token` is validated by the agent group `preHandler` against the
  `chats` table. A missing or unknown token returns **401**. Only
  `POST /agent/chats` opts out (it *creates* the token, so it cannot present one).
- When a route has a `:chatToken` path parameter (`getChat`, `saveChat`), the
  `preHandler` still requires the `x-chat-token` **header**; pass the same token
  in both the header and the path segment.

> ⚠️ The static `x-api-key` is **not** real authentication — it is visible in the
> trusted frontends' client bundles. Treat the Node backend as a trusted internal
> service. Per-user auth is not yet implemented; all data is scoped to a single
> research user (`RESEARCH_USER_ID = 1`).

### Response content types

- **Chat lifecycle** (`POST /agent/chats`, `GET /agent/chats/:chatToken`) →
  `application/json; charset=utf-8`.
- **`PUT /agent/chats/:chatToken`** → `204 No Content` (empty body).
- **Tools** (`plantReports`, `plantHistory`, `userPlants`, `lookAtPhoto`) →
  `text/plain; charset=utf-8`. The agent works in natural language and **never**
  receives structured JSON for tool output — the backend formats the data into
  readable text server-side.

### Error shape

All errors are JSON (`application/json`), even from the text-returning tool
endpoints (Fastify's error serializer runs before the text response). The common
shape:

```json
{ "statusCode": 404, "error": "NotFoundError", "message": "Plant not found" }
```

- The 401s from the auth gates return a minimal `{ "message": "..." }` body.
- Zod validation failures (bad request body) return 400 with an extra `details`
  array: `{ "statusCode": 400, "error": "Bad Request", "message": "Validation error", "details": [...] }`.

### Status codes at a glance

| Status | Meaning                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| 200    | Success (JSON for lifecycle, `text/plain` for tools).                                    |
| 204    | `saveChat` succeeded.                                                                    |
| 400    | Request body failed Zod validation (e.g. `lookAtPhoto` with empty `query`).              |
| 401    | Missing/invalid `x-api-key`, or missing/invalid `x-chat-token` on a token-gated route.   |
| 404    | Plant/report/chat referenced does not exist or is not owned by the chat's user.          |
| 502    | `lookAtPhoto` vision-LLM call failed (generic message; details logged server-side).      |
| 500    | Unexpected internal error (generic message; stack trace logged server-side, never sent).|

### Server-side logging (no client action required)

Every `/agent` call is logged to an `agent_events` table with the tool name,
request params, the (truncated to 10k chars) plain-text response, latency, and any
error. `lookAtPhoto` additionally writes a linked `llm_requests` row. The client
does not need to send anything for this; it is for metrics and debugging.

---

## 3. Chat lifecycle

### 3.1 `POST /agent/chats` — create a chat (mint token)

Starts a chat for a plant. **No `x-chat-token` header.**

- **Body**: `{ "plantId": <integer> }`
- **Response** `200` — `CreateChatResponseDto`:
  ```json
  {
    "chatToken": "5b1f9c2e-...-uuid",
    "contextText": "Plant: Aloe\n...\nLatest report:\n  ...",
    "plantId": 1,
    "plantName": "Aloe",
    "defaultReportId": 12
  }
  ```
  - `chatToken` — the opaque handle; send it as `x-chat-token` on all subsequent
    calls for this chat.
  - `contextText` — a plain-text summary of the plant and its **latest report**
    (see §5.1). Use this as the agent's initial context so it can answer the first
    user message without an extra tool call.
  - `defaultReportId` — the latest report's id at creation time, or `null` if the
    plant has no reports yet. This is the default `reportId` for `lookAtPhoto`.
- **Errors**: `404` if the plant does not belong to the research user.

```bash
curl -X POST "$BACKEND/agent/chats" \
  -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"plantId": 1}'
```

### 3.2 `GET /agent/chats/:chatToken` — load saved history

Returns the saved conversation blob so the agent can resume. Token-gated.

- **Path**: `:chatToken` (string) — the same token sent in the `x-chat-token` header.
- **Response** `200` — `ChatHistoryDto`:
  ```json
  {
    "chatToken": "5b1f9c2e-...",
    "plantId": 1,
    "plantName": "Aloe",
    "defaultReportId": 12,
    "history": <opaque blob, or null>,
    "createdAt": "2026-08-09T10:00:00.000Z",
    "updatedAt": "2026-08-09T11:00:00.000Z"
  }
  ```
  - `history` is opaque to the backend — whatever the agent last saved via
    `saveChat` (its LangGraph message array), returned as-is, or `null` if never
    saved. The agent owns the shape; the backend never interprets it.
- **Errors**: `404` if the chat row is gone. (An *invalid* token is rejected by the
  `preHandler` with `401` before reaching this handler.)

### 3.3 `PUT /agent/chats/:chatToken` — save history

Overwrites the conversation blob for the chat. Token-gated.

- **Path**: `:chatToken`
- **Body**: `{ "history": <opaque> }` — any JSON-serializable value (typically the
  agent's message array). There is no schema; the backend stores it verbatim.
- **Response**: `204 No Content` (empty body).
- **Errors**: `404` if the chat is not found. (Invalid token → `401` from the
  `preHandler`.)

> The backend writes the blob wholesale and returns it as-is on load — there is no
> append/merge semantics. Save the full message array each time.

### Token lifecycle notes

- Tokens **do not expire or invalidate**. A user may resume a chat arbitrarily
  later by reusing the same `chatToken`.
- Each `POST /agent/chats` mints a **new** chat row + token. There is no "open
  existing chat" by plant; the caller tracks which token belongs to which plant.

---

## 4. Tool endpoints

All four return `text/plain; charset=utf-8`. All require `x-chat-token` (and
`x-api-key`). The backend scopes every query to the chat's user; an explicit
`plantId`/`reportId` must still belong to that user or the call returns `404`.

### 4.1 `GET /agent/plantReports` — recent reports, full detail

Returns the **last 3 reports** for the plant with full detail (dates, summary,
identification, recommendations, stress signs with severity **and** notes), plus a
final "N more" note when the plant has more history.

- **Query**: `plantId` (integer, optional) — defaults to the chat's bound plant.
  If provided, must belong to the chat's user.
- **Response**: `text/plain` — see §5.2 for the format.
- **Errors**: `404` if `plantId` is not found / not owned.

```bash
curl "$BACKEND/agent/plantReports?plantId=1" \
  -H "x-api-key: $KEY" -H "x-chat-token: $TOKEN"
```

### 4.2 `GET /agent/plantHistory` — all reports, brief

Returns **every** report for the plant, briefly (dates, summary, stress signs
**without** notes). Use this for trend/over-time questions; use `plantReports` for
deep detail on recent reports.

- **Query**: `plantId` (integer, optional) — defaults to the chat's bound plant.
- **Response**: `text/plain` — see §5.3.
- **Errors**: `404` if `plantId` is not found / not owned.

### 4.3 `GET /agent/userPlants` — the user's plants

Returns the user's plants, **capped at 10**: name, species, report count, and
current (latest-report) stress signs. No request body or query.

- **Response**: `text/plain` — see §5.4.
- **Errors**: none beyond auth (401). Empty account → a "No plants found…" message
  (still `200`).

```bash
curl "$BACKEND/agent/userPlants" -H "x-api-key: $KEY" -H "x-chat-token: $TOKEN"
```

### 4.4 `POST /agent/lookAtPhoto` — vision LLM Q&A on a report photo

Answers a free-text question about a report's photo using the vision LLM. Defaults
to the chat's `defaultReportId` (the latest report at chat creation).

- **Body**: `{ "reportId": <integer, optional>, "query": <non-empty string> }`
  - `reportId` — defaults to the chat's `defaultReportId`. If the chat's plant has
    no reports, there is no default and the call returns `404`.
  - `query` — the question about the photo (required, non-empty).
- **Response**: `text/plain` — the LLM's natural-language answer.
- **Errors**:
  - `400` if `query` is missing/empty (Zod validation).
  - `404` if `reportId` (or its photo) is not found / not owned / has no stored
    original image.
  - `502 Bad Gateway` with message `Look-at-photo failed` if the vision LLM call
    itself fails (provider details are logged server-side, not leaked).

The backend builds a vision prompt from the report context (plant name, date,
summary, present stress signs) appended to the user's `query`, downscales the
stored original photo to the same 1024px display variant the analysis pipeline
uses, and sends both to the LLM.

```bash
curl -X POST "$BACKEND/agent/lookAtPhoto" \
  -H "x-api-key: $KEY" -H "x-chat-token: $TOKEN" -H "Content-Type: application/json" \
  -d '{"reportId": 12, "query": "Are the leaf tips brown and crispy?"}'
```

---

## 5. Plain-text response formats (what the agent receives)

These are the exact shapes the backend emits. Document them to the agent in its
tool descriptions so it knows what to expect and how to parse/quote them. All use
`\n` line breaks, two-space indentation for report blocks, and `- ` bullets for
stress signs.

### 5.1 `contextText` (from `POST /agent/chats`)

When the plant has at least one report:

```
Plant: Aloe
Species: Aloe vera
Notes: On the windowsill

Latest report:
  Report — 2026-08-09 (id 12)
  Identified: Aloe vera (Aloe barbadensis), 95% confidence
  Likely stressors: water, light
  Summary: Lower leaves yellowing and soft to the touch.
  Recommendations: Reduce watering frequency and check drainage.
  Stress signs:
    - Present (moderate): Leaf yellowing, 80% confidence — lower leaves
    - Absent: Brown spots, 90% confidence
```

When the plant has no reports yet:

```
Plant: Aloe
Species: Aloe vera
Notes: On the windowsill

No reports have been created for this plant yet.
```

Field rules: `Species`, `Notes`, `Recommendations`, and the `Identified`/`Likely
stressors` lines are omitted when empty. Stress signs are filtered to
`present`/`absent` only (unevaluated/`unknown` signs are dropped), sorted
present-first then by name.

### 5.2 `plantReports` text

```
Last 3 report(s) for "Aloe":

Report — 2026-08-09 (id 12)
Identified: Aloe vera (Aloe barbadensis), 95% confidence
Likely stressors: water, light
Summary: Lower leaves yellowing and soft to the touch.
Recommendations: Reduce watering frequency and check drainage.
Stress signs:
  - Present (moderate): Leaf yellowing, 80% confidence — lower leaves
  - Absent: Brown spots, 90% confidence

Report — 2026-08-02 (id 11)
...

There are 2 more report(s) in this plant's history.
```

When the plant has no reports:

```
Last 0 report(s) for "this plant":

No reports found for this plant.
```

Note the trailing "N more" line only appears when there are more than 3 reports.

### 5.3 `plantHistory` text

```
Report history for "Aloe" (3 report(s)):

2026-08-09 (id 12)
Identified: Aloe vera
Summary: Lower leaves yellowing and soft to the touch.
Stress signs:
  - Present (moderate): Leaf yellowing
  - Absent: Brown spots

2026-08-02 (id 11)
...
```

When empty:

```
No reports found for "this plant".
```

### 5.4 `userPlants` text

```
Your plants (2):

1. Aloe
   Species: Aloe vera
   Reports: 5
   Current stress signs: Leaf yellowing (moderate)
2. Pothos
   Reports: 0
```

- `Species` is omitted when null. The `Current stress signs` line is omitted for
  plants with no present signs. Empty account: `No plants found on this account.`

### 5.5 `lookAtPhoto` text

Free-form natural language from the vision LLM. There is no fixed schema — treat
it as the model's answer to the query about the photo.

---

## 6. Python integration (LangGraph)

### 6.1 A minimal HTTP client

An `httpx`-based client that centralizes the two headers and splits JSON vs
text responses. Error responses are JSON even from the text endpoints, so always
parse errors as JSON.

```python
import httpx

class AgentClient:
    def __init__(self, base_url: str, api_key: str, *, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self, chat_token: str | None = None) -> dict[str, str]:
        h = {"x-api-key": self.api_key}
        if chat_token is not None:
            h["x-chat-token"] = chat_token
        return h

    def _raise_for_status(self, resp: httpx.Response) -> None:
        if resp.is_success:
            return
        try:
            body = resp.json()
            msg = body.get("message") or f"HTTP {resp.status_code}"
        except Exception:
            msg = resp.text or f"HTTP {resp.status_code}"
        raise RuntimeError(f"{resp.status_code}: {msg}")

    # --- lifecycle -------------------------------------------------------
    def create_chat(self, plant_id: int) -> dict:
        r = httpx.post(
            f"{self.base_url}/agent/chats",
            headers={**self._headers(), "Content-Type": "application/json"},
            json={"plantId": plant_id},
            timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.json()  # {chatToken, contextText, plantId, plantName, defaultReportId}

    def get_chat(self, chat_token: str) -> dict:
        r = httpx.get(
            f"{self.base_url}/agent/chats/{chat_token}",
            headers=self._headers(chat_token),
            timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.json()

    def save_chat(self, chat_token: str, history: list[dict] | dict) -> None:
        r = httpx.put(
            f"{self.base_url}/agent/chats/{chat_token}",
            headers={**self._headers(chat_token), "Content-Type": "application/json"},
            json={"history": history},
            timeout=self.timeout,
        )
        self._raise_for_status(r)  # 204 on success

    # --- tools (text/plain) ---------------------------------------------
    def plant_reports(self, chat_token: str, plant_id: int | None = None) -> str:
        params = {"plantId": plant_id} if plant_id is not None else None
        r = httpx.get(
            f"{self.base_url}/agent/plantReports",
            params=params, headers=self._headers(chat_token), timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.text

    def plant_history(self, chat_token: str, plant_id: int | None = None) -> str:
        params = {"plantId": plant_id} if plant_id is not None else None
        r = httpx.get(
            f"{self.base_url}/agent/plantHistory",
            params=params, headers=self._headers(chat_token), timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.text

    def user_plants(self, chat_token: str) -> str:
        r = httpx.get(
            f"{self.base_url}/agent/userPlants",
            headers=self._headers(chat_token), timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.text

    def look_at_photo(self, chat_token: str, query: str, report_id: int | None = None) -> str:
        body: dict = {"query": query}
        if report_id is not None:
            body["reportId"] = report_id
        r = httpx.post(
            f"{self.base_url}/agent/lookAtPhoto",
            headers={**self._headers(chat_token), "Content-Type": "application/json"},
            json=body, timeout=self.timeout,
        )
        self._raise_for_status(r)
        return r.text
```

### 6.2 End-to-end lifecycle

```python
client = AgentClient(base_url="http://localhost:4100", api_key=BACKEND_API_KEY)

# 1. The app starts a chat (usually the mobile app does this and hands you the token;
#    shown here for completeness).
created = client.create_chat(plant_id=1)
chat_token = created["chatToken"]
context_text = created["contextText"]   # feed this to the agent as initial context
default_report_id = created["defaultReportId"]

# 2. The agent answers the user using tools (all need the same chat_token).
recent = client.plant_reports(chat_token)          # last 3 reports, full detail
trend  = client.plant_history(chat_token)          # every report, brief
all_plants = client.user_plants(chat_token)        # the user's plants (<=10)
answer = client.look_at_photo(                      # vision Q&A
    chat_token, query="Are the leaf tips brown?", report_id=default_report_id,
)

# 3. Persist the agent's message array, then resume later.
client.save_chat(chat_token, history=agent_state.messages)
restored = client.get_chat(chat_token)             # {"history": agent_state.messages, ...}
```

### 6.3 Mapping endpoints to LangGraph tools

Expose the four tool endpoints as LangGraph tools. Give each a docstring that
tells the model **what it returns** (the text format from §5) and **when** to use
it — this is what makes the model pick the right tool. The lifecycle endpoints are
called by your graph/state management, not by the model.

```python
from langchain_core.tools import tool

# `client` and `chat_token` are provided via closure, dependency injection, or a
# RunnableConfig — however your graph threads per-call state.

@tool
def get_recent_reports(plant_id: int | None = None) -> str:
    """Get the last 3 diagnostic reports for the chat's plant (or another plant
    owned by the user) WITH FULL DETAIL: date, identified species, likely
    stressors, summary, recommendations, and each stress sign with severity and
    notes. Use this to answer questions about recent findings or specific signs.

    Leave plant_id as None to use the chat's default plant. Returns plain text;
    reports are separated by blank lines. If the plant has >3 reports, a final
    line notes how many more exist in history.
    """
    return client.plant_reports(chat_token, plant_id)

@tool
def get_report_history(plant_id: int | None = None) -> str:
    """Get EVERY diagnostic report for the chat's plant (or another owned plant)
    in BRIEF form: date, summary, and stress signs WITHOUT notes. Use this for
    trends over time or to see the full list of past reports. For detail on
    recent reports, use get_recent_reports instead.

    Leave plant_id as None to use the chat's default plant. Returns plain text.
    """
    return client.plant_history(chat_token, plant_id)

@tool
def list_user_plants() -> str:
    """List the user's plants (up to 10): name, species, report count, and
    current stress signs from the latest report. Use this when the user asks
    about their plants in general, or to find a plant id before asking about a
    specific plant's reports. Returns plain text."""
    return client.user_plants(chat_token)

@tool
def look_at_photo(query: str, report_id: int | None = None) -> str:
    """Answer a question about a plant photo by sending it to the vision LLM.
    Use this when the user asks something visible in the photo (leaf color,
    spots, texture, damage) that the stored report text alone may not cover.

    query: the question about the photo (required, non-empty).
    report_id: which report's photo to inspect. Leave as None to use the chat's
    default report (the latest report at chat creation). Returns the LLM's
    answer as plain text.
    """
    return client.look_at_photo(chat_token, query, report_id)
```

Notes for your graph:
- Seed the conversation with `contextText` from `createChat` as a system/user
  message so the first turn needs no tool call.
- Bind the four tools above to your agent node; the model decides which to call.
- After each model turn (or on checkpoint), call `saveChat` with the full
  message array. On resume, call `getChat` and rehydrate.
- `lookAtPhoto` is the only tool that incurs an LLM round-trip server-side and can
  return `502`; handle that error gracefully (the photo vision model may be
  unavailable) rather than aborting the whole turn.

---

## 7. Constraints and gotchas

- **Single user.** All data is scoped to `RESEARCH_USER_ID = 1` until real auth
  lands. There is no multi-tenant behavior to integrate against.
- **No token invalidation/expiry.** Tokens live indefinitely; the agent may resume
  a chat much later. Do not assume recency of `defaultReportId` — it is fixed at
  chat creation and will not track new reports added afterward. For the true latest
  report, call `plantReports`.
- **`plantId`/`reportId` are numeric and re-authorized.** The agent may pass them
  freely; the backend rejects any that do not belong to the chat's user with
  `404`. The "don't expose internal ids" rule applies only to the **chat handle**
  (opaque token), not to plant/report ids.
- **History is an opaque blob.** The backend stores whatever JSON the agent sends
  via `saveChat` and returns it verbatim via `getChat`. Choose and own your message
  shape (LangGraph's serialized state is fine). There is no append/merge — send the
  full array each save.
- **Text, not JSON, for tools.** Parse tool results as plain text; do not try to
  JSON-parse `plantReports`/`plantHistory`/`userPlants`/`lookAtPhoto` bodies. Only
  error responses are JSON.
- **`getChat`/`saveChat` need the token twice.** The `preHandler` requires the
  `x-chat-token` header (auth) *and* the route takes `:chatToken` in the path. Use
  the same token value in both.
- **Error messages may leak a little.** `404` messages like `Plant not found` and
  `Chat not found` are safe; `lookAtPhoto` `502` deliberately returns a generic
  `Look-at-photo failed` (provider internals are server-side only). `500`s are
  always generic.

---

## 8. Reference

- Endpoint inventory & auth overview: [`backend-endpoints.md`](./backend-endpoints.md)
- Backend agent routes: `apps/backend/src/app/routes/agent/` (`chats.ts`,
  `plant-reports.ts`, `plants.ts`, `look-at-photo.ts`)
- Services: `apps/backend/src/app/services/` (`chats.service.ts`,
  `agent-tools.service.ts`, `agent-format.service.ts`, `agent-auth.ts`)
- Shared types: `CreateChatResponseDto`, `ChatHistoryDto`, `agentToolNames` /
  `AgentToolName`, `RESEARCH_USER_ID` in `libs/api-types/src/index.ts`
- DB schema: `chats` and `agent_events` tables in `libs/db/src/schema/`
  (migration `libs/db/migrations/0004_ambitious_leo.sql`)