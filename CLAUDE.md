# CLAUDE.md

This is an Nx monorepo for Plant-Doctor, an AI project to help diagnose houseplants.

See [AGENTS.md](./AGENTS.md) for the full guide to all apps and libraries in this repo, including their stack, paths, Nx names, and how to run them.

## Quick orientation
- Monorepo tooling: **Nx** (v23) + npm. Run everything from the repo root after `npm install`.
- Apps live in `apps/`, shared libraries in `libs/`.
- Apps: `frontend`, `dashboard`, `architecture` (React/Vite), `backend` (Node/Fastify), `backend-py` (Python/FastAPI/LangGraph), `mobile-app` (Expo/React Native).
- Libs: `db` (Drizzle ORM database layer), `api-types` (shared TypeScript types).
- Env: copy `.env.example` to `.env` before first run (see `docs/nx-commands.md`).
- Useful docs: `docs/backend-endpoints.md`, `docs/database.md`, `docs/nx-commands.md`.

## Current state 
- **Dashboard** is furthest along — LLM evaluation platform with scoring-based consistency evaluation for single-image-N-runs and multi-image batch.
- **Backend** implements all currently-needed API endpoints, incl. one-shot LLM plant diagnostics.
- **mobile-app** is a working tech demo (UI/UX WIP) and is intended to replace the web `frontend` as the consumer app.
- **frontend** is a WIP test zone — check before investing in new features there.
- **backend-py** is WIP.
- The old `frontend-e2e` app was removed; future E2E will use Maestro for the mobile app.
- In `libs/db`, the `user_events` table is defined but currently unused.

See per-app "Status" notes in [AGENTS.md](./AGENTS.md) for more.

Start with [AGENTS.md](./AGENTS.md) for details on each app.