# Plant Doctor — Agent Guide

AI-powered app for diagnosing houseplants. This is an [Nx](https://nx.dev) monorepo with a React frontend and two API backends (Node and Python).

## Repository layout

```
Plant-Doctor/
├── apps/
│   ├── frontend/          # React 19 + Vite UI
│   ├── backend/           # Fastify API (Node / TypeScript)
│   ├── backend-py/        # FastAPI (Python 3.12, uv)
│   └── frontend-e2e/      # Playwright end-to-end tests
├── docs/
│   └── nx-commands.md     # Nx task reference and env var docs
├── .env.example           # Copy to .env before first run
└── package.json           # Root npm scripts and shared devDependencies
```

## Apps

| Project        | Stack                         | Source root              | Default URL              |
|----------------|-------------------------------|--------------------------|--------------------------|
| `frontend`     | React, Vite, React Router     | `apps/frontend/src`      | http://localhost:4000    |
| `backend`      | Fastify, esbuild              | `apps/backend/src`       | http://localhost:4100    |
| `backend-py`   | FastAPI, uv, pytest, ruff      | `apps/backend-py/src`    | http://localhost:4200    |
| `frontend-e2e` | Playwright                    | `apps/frontend-e2e/src`  | —                        |

### Frontend (`apps/frontend`)

- Entry: `src/main.tsx` → `src/app/app.tsx`
- Config: `src/config.ts` (reads Vite env vars from root `.env`)
- Tests: Vitest (`src/app/app.spec.tsx`)

### Node backend (`apps/backend`)

- Entry: `src/main.ts` → registers `src/app/app.ts`
- Routes and plugins auto-loaded from `src/app/routes/` and `src/app/plugins/`
- Config: `src/config.ts` (reads `process.env` at runtime)

### Python backend (`apps/backend-py`)

- Package: `backend_py` under `src/backend_py/`
- Entry: `main.py` (FastAPI app), run via `python -m backend_py`
- Config: `src/backend_py/config.py`
- Dependencies: `pyproject.toml` + `uv.lock`; managed with `uv`

## Configuration

All apps share a single root `.env` (gitignored). Copy `.env.example` to `.env` before running.

Key variables: `HOST`, `PORT`, `BACKEND_PY_PORT`, `FRONTEND_URL`, `BACKEND_URL`, `BACKEND_PY_URL`, `LLM_API_KEY`.

- **Frontend**: Vite exposes vars prefixed with `VITE_`, `FRONTEND_`, or `BACKEND_` at build/dev time.
- **Backends**: Read env at runtime via their config modules.

## Common commands

Run from the repository root after `npm install`:

```bash
npm run dev                  # Serves frontend (+ both backends via Nx dependsOn)
npx nx serve <project>       # Serve a single app
npx nx test <project>        # frontend: Vitest, backend: Jest, backend-py: pytest
npx nx build <project>       # Production build → dist/apps/<project>
npx nx lint <project>        # ESLint (TS) or ruff (Python)
npx nx e2e frontend-e2e      # Playwright e2e tests
```

See `docs/nx-commands.md` for the full Nx cheat sheet.

## Conventions

- **Monorepo tasks**: Use `npx nx <target> <project>` — do not bypass Nx for builds, tests, or serve.
- **Python deps**: Use `npx nx add backend-py <package>` or `uv` within `apps/backend-py`; keep `uv.lock` in sync.
- **New Fastify routes**: Add files under `apps/backend/src/app/routes/`.
- **Build output**: `dist/apps/` (Node/frontend); Python build output in `apps/backend-py/dist/`.
