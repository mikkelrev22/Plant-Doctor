# Nx commands cheat sheet

This repo is an [Nx](https://nx.dev) monorepo. Nx organizes code into **projects** (apps and libraries) and runs **tasks** (build, serve, test, lint, etc.) for each one.

Run every command below from the **repository root** after `npm install`.

## Environment variables

Copy the example env file before your first run:

```bash
cp .env.example .env
```

| Variable          | Used by    | Purpose                                      |
|-------------------|------------|----------------------------------------------|
| `HOST`            | backend    | Network interface the API binds to           |
| `PORT`            | backend    | Port the Node API listens on                 |
| `BACKEND_PY_PORT` | backend-py | Port the Python API listens on               |
| `FRONTEND_URL`    | all        | Public URL of the React app                  |
| `BACKEND_URL`     | both       | Public URL of the Fastify API                |
| `BACKEND_PY_URL`  | backend-py | Public URL of the FastAPI service            |

All apps read from the **root** `.env` file (gitignored). Use the per-app config modules in code:

```ts
// apps/frontend/src/config.ts
import { config } from './config';
fetch(`${config.backendUrl}/...`);

// apps/backend/src/config.ts
import { config } from './config';
// e.g. config.frontendUrl for CORS
```

```python
# apps/backend-py/src/backend_py/config.py
from backend_py.config import config
# e.g. config.frontend_url for CORS
```

**Frontend without SSR:** the React app can read `.env` values — no server-side rendering required. Vite injects matching variables into the client bundle at **dev/build time** via `import.meta.env`. Restart `npm run dev` after changing `.env`.

Only variables with these prefixes are exposed to the browser: `VITE_`, `FRONTEND_`, `BACKEND_`. Anything with those prefixes is **public** (fine for URLs; never put secrets there). The backend reads vars at **runtime** via `process.env`.

## Quick start (local dev)

The fastest way to run the app locally:

```bash
npm run dev
```

That script is defined in the root `package.json` and starts both apps in parallel:

```json
"dev": "nx run-many -t serve -p frontend backend"
```

| App          | What it is              | Default URL              |
|--------------|-------------------------|--------------------------|
| `frontend`   | React + Vite UI         | http://localhost:4000    |
| `backend`    | Fastify API (Node)      | http://localhost:4100    |
| `backend-py` | FastAPI (Python + uv)   | http://localhost:4101    |

To run a single app instead:

```bash
npx nx serve frontend
npx nx serve backend
npx nx serve backend-py
```

> **Tip:** Use `npx nx` (or install Nx globally) — there is no separate `nx` binary in `PATH` unless you use `npx`.

## Projects in this repo

```bash
npx nx show projects
```

| Project        | Path                  | Notes                          |
|----------------|-----------------------|--------------------------------|
| `frontend`     | `apps/frontend`       | React app (Vite)               |
| `backend`      | `apps/backend`        | Fastify API (esbuild + Node)   |
| `backend-py`   | `apps/backend-py`     | FastAPI (uv + Python 3.12)     |
| `frontend-e2e` | `apps/frontend-e2e`   | Playwright end-to-end tests    |

To see all tasks available for a project:

```bash
npx nx show project frontend
npx nx show project frontend --web   # opens a visual UI in the browser
```

## Everyday tasks

Run a task for one project:

```bash
npx nx <task> <project>
```

Examples:

```bash
npx nx build frontend          # production build → dist/apps/frontend
npx nx build backend           # production build → dist/apps/backend
npx nx test frontend           # Vitest unit tests
npx nx test backend            # Jest unit tests
npx nx test backend-py         # pytest unit tests
npx nx lint frontend           # ESLint
npx nx lint backend-py         # ruff
npx nx e2e frontend-e2e        # Playwright e2e tests
```

Run the same task across multiple projects:

```bash
npx nx run-many -t build -p frontend backend
npx nx run-many -t test --all
npx nx run-many -t lint --all
```

## Exploring the workspace

```bash
npx nx graph                 # interactive dependency graph in the browser
npx nx report                # Nx version, plugins, and environment info
npx nx list                  # installed Nx plugins and generators
```

## Affected commands (CI / before pushing)

Nx can figure out which projects changed since `main` and only run tasks on those:

```bash
npx nx affected -t test
npx nx affected -t lint
npx nx affected -t build
```

Use `--base=main` (or another branch) if your default branch differs.

## Scaffolding (generators)

Add Nx plugins or generate new apps/libraries:

```bash
npx nx add @nx/react

# example: generate a new React app (already done for frontend)
npx nx g @nx/react:app apps/frontend

# generate a component inside an existing app
npx nx g @nx/react:component apps/frontend/src/app/MyComponent
```

Run `npx nx list @nx/react` to see all generators for a plugin.

## Watch mode

Re-run a command whenever files in a project change:

```bash
npx nx watch --projects frontend -- npx nx build frontend
npx nx watch --all -- echo $NX_PROJECT_NAME   # print project name on any change
```

## Useful mental model

```
npm run dev
    └── nx run-many -t serve -p frontend backend
            ├── frontend:serve    →  vite dev server (port 4000)
            └── backend:serve     →  build + node (port 4100)

npx nx serve backend-py          →  uvicorn (port 4101, separate from npm run dev)
```

- **Project** = `frontend`, `backend`, `backend-py`, `frontend-e2e`
- **Target / task** = `serve`, `build`, `test`, `lint`, `e2e`, …
- **Invocation** = `npx nx <target> <project>`

When in doubt, `npx nx show project <name>` lists every target and how it is configured.
