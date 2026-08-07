// Agent namespace for the future backend-py (Python LangGraph) gateway.
// backend-py will retrieve DB data through these HTTP endpoints instead of
// reading the DB directly. No endpoints yet — this file only reserves the
// /agent prefix so per-group auth can be wired in app.ts now. Add new route
// files alongside this one (e.g. routes/agent/plants.ts); they will mount
// under /agent automatically.
export default async function agentRoutes() {
  // TODO: agent-facing read endpoints (plants/reports lookup for backend-py).
}