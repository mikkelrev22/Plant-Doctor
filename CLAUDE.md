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

Start with [AGENTS.md](./AGENTS.md) for details on each app.