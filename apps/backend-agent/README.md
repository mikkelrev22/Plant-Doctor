# backend-agent

Reference LangGraph agent service for Plant-Doctor. It is a **pluggable, A/B-testable**
agent microservice: the mobile app talks to it over the **AI SDK UI Message Stream**
protocol, and the agent reaches plant/report data through the Node backend's
`/agent/*` HTTP tool gateway (see `docs/agent-integration.md`).

This app is a deliberate **minimal working draft** — a clean reference for the
`backend-py` owner to learn from. It is the first service to actually wire the
documented `AgentClient` + four gateway tools and to emit the AI SDK stream protocol.

## Run

```bash
npx nx serve backend-agent          # or: uv run python -m backend_agent (from this dir, PYTHONPATH=src)
```

Default URL `http://localhost:4300` (`BACKEND_AGENT_PORT`). Requires the Node backend
on `http://localhost:4100` (`BACKEND_URL`) with a matching `BACKEND_API_KEY`, and
`LLM_API_*` set for the model.

See `docs/backend-agent.md` for the endpoint contract and `docs/agent-integration.md`
for the tool gateway it consumes.