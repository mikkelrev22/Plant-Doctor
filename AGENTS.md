# Plant-Doctor — Monorepo Guide

Plant-Doctor is an AI project that helps diagnose houseplants. This is an [Nx](https://nx.dev) monorepo managed with npm workspaces. It contains two backends (Node + Python), three React web apps, one Expo mobile app, and two shared libraries.

All commands run from the repo root after `npm install`. Copy `.env.example` to `.env` first. See `docs/nx-commands.md` and `docs/backend-endpoints.md` for details.

## Apps

| App | Path | Stack | Nx name | Run |
|-----|------|-------|---------|-----|
| Frontend | `apps/frontend` | React + Vite + React Router | `frontend` | `npx nx serve frontend` (alias `npm run dev`) |
| Dashboard | `apps/dashboard` | React + Vite + Mantine + React Router | `dashboard` | `npx nx serve dashboard` (alias `npm run dashboard`) |
| Architecture | `apps/architecture` | React + Vite + Mantine + React Flow | `architecture` | `npx nx serve architecture` (alias `npm run architecture`) |
| Backend | `apps/backend` | Node + Fastify + AutoLoad | `backend` | `npx nx serve backend` |
| Backend (Python) | `apps/backend-py` | Python + FastAPI + LangGraph (uv) | `backend-py` | `npx nx run backend-py:serve` |
| Mobile app | `apps/mobile-app` | Expo + React Native + Expo Router | `mobile-app` | `npx nx run mobile-app:start` / `expo start` |

### Frontend (`apps/frontend`)
The main user-facing web app for diagnosing houseplants. React + Vite + React Router. Pages: home, **Linear diagnosis** (`linear-diagnosis.tsx`), **Agent chat** (`agent-chat.tsx`). Talks to the Python backend for health checks and the Node backend for data. Config in `src/config.ts`. Note: this app currently calls the Python backend by default.

**Status:** Work in progress / test zone. May be made obsolete by the mobile app — check before investing in new features here.

### Dashboard (`apps/dashboard`)
An LLM evaluation platform for one-shot plant-diagnosis requests. React web app (Vite + Mantine + React Router). Run the same request N times on one image, or across multiple images (batch), to compare results for consistency and correctness and see which LLM/temperature perform best. Mantine `AppShell` with a sidebar; pages: `HomePage`, `PlantPage`, `ReportPage`. Data fetched via `src/queries.ts`. Built on the shared `db` library / Node backend.

**Status:** Furthest along. Scoring-based evaluation for consistency is implemented for both single-image-N-runs and multi-image batch.

### Architecture (`apps/architecture`)
A React web app (Vite + Mantine + React Flow) for keeping an interactive architecture diagram of the system in hand for collaboration. Single `ArchitecturePage` view. Built on the Node backend's `architecture` route and `@xyflow/react`.

**Status:** Diagram editor works; content still needs updating.

### Backend (`apps/backend`)
The Node API. Fastify with `@fastify/autoload` for plugins (`src/app/plugins`) and routes (`src/app/routes`): `architecture.ts`, `llm-requests.ts`, `plants.ts`, `reports.ts`, `root.ts`, `stress-signs.ts`. Services in `src/app/services`, types in `src/app/types`. Default URL `http://localhost:4100`. Reads root `.env` (`HOST`, `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `DATABASE_URL`). Uses the shared `db` library.

**Status:** Implements all currently-needed API endpoints, including one-shot LLM requests for a plant's basic diagnostics.

### Backend (Python) (`apps/backend-py`)
The Python API: FastAPI + LangGraph, managed with `uv` (see `pyproject.toml`, `uv.lock`). Source in `src/backend_py`; run via `uv run python -m backend_py`. Tests via `uv run pytest tests/`; LLM evals in `evals/`. Default URL `http://localhost:4200` (`BACKEND_PY_PORT`, `BACKEND_PY_URL`).

**Status:** Work in progress.

### Mobile app (`apps/mobile-app`)
Expo + React Native (Expo Router) app named `mobile-plant-doctor` — the consumer-facing app. File-based routing under `src/app` (`index.tsx`, `explore.tsx`, `_layout.tsx`). Shared UI primitives in `src/components`, theme in `src/constants/theme.ts`. Primary targets: web + Expo Go to run on mobile devices. Targets: `start` (`expo start`), `ios`, `android`, `web`, `lint`. Config in `app.json`. See the `expo:*` skills for EAS builds, store submission, etc.

**Status:** Working tech demo; UI/UX is a work in progress. Intended to eventually replace the web `frontend` as the consumer app.

## Libraries

| Lib | Path | Purpose | Nx name | Key targets |
|-----|------|---------|---------|-------------|
| db | `libs/db` | Shared database layer (Drizzle ORM) — schema in `src/schema`, client in `src/client.ts`, barrel export in `src/index.ts`. Solid relational foundation for current needs; the `user_events` table is defined but currently unused. | `db` | `generate`, `migrate`, `studio` (`npm run db`), ER diagram generation |
| api-types | `libs/api-types` | Shared TypeScript API types, barrel-exported from `src/index.ts` | `api-types` | build/test/lint |

## Common tasks

- Install: `npm install` (root), then `uv` deps for backend-py if working on it.
- Env: `cp .env.example .env` — see `docs/nx-commands.md` for the full variable table.
- Run a web app: `npm run dev` (frontend) / `dashboard` / `architecture`, or `npx nx serve <name>`.
- Run the Node backend: `npx nx serve backend`.
- Run the Python backend: `npx nx run backend-py:serve`.
- Run mobile: `npx nx run mobile-app:start` (or `cd apps/mobile-app && expo start`).
- Database migrations: `npx nx run db:generate` / `db:migrate`; inspect with `npx nx run db:studio` (alias `npm run db`).
- Tests/lint: `npx nx run <name>:test` / `:lint` (Vitest/Jest for JS, `uv run pytest` for backend-py).
- E2E: the old `frontend-e2e` app has been removed. Future E2E testing will use [Maestro](https://maestro.mobile.dev/) for the Expo mobile app.

## Further reading
- `docs/backend-endpoints.md` — full API endpoint reference for both backends.
- `docs/database.md` / `docs/architecture.json` — database and architecture references.
- `docs/nx-commands.md` — Nx cheat sheet and env-var table.