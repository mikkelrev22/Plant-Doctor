# Nx commands cheat sheet

This repo is an [Nx](https://nx.dev) monorepo. Nx organizes code into **projects** (apps and libraries) and runs **tasks** (build, serve, test, lint, etc.) for each one.

Run every command below from the **repository root** after `npm install`.

## Quick start (local dev)

The fastest way to run the app locally:

```bash
npm run dev
```

That script is defined in the root `package.json` and starts both apps in parallel:

```json
"dev": "nx run-many -t serve -p frontend backend"
```

| App        | What it is              | Default URL              |
|------------|-------------------------|--------------------------|
| `frontend` | React + Vite UI         | http://localhost:4000    |
| `backend`  | Fastify API             | http://localhost:3000    |

To run a single app instead:

```bash
npx nx serve frontend
npx nx serve backend
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
npx nx lint frontend           # ESLint
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
            ├── frontend:serve  →  vite dev server (port 4000)
            └── backend:serve   →  build + node (port 3000)
```

- **Project** = `frontend`, `backend`, `frontend-e2e`
- **Target / task** = `serve`, `build`, `test`, `lint`, `e2e`, …
- **Invocation** = `npx nx <target> <project>`

When in doubt, `npx nx show project <name>` lists every target and how it is configured.
