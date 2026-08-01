# Multi-stage build for the Plant-Doctor backend (Fastify + Drizzle + sharp).
#
# Build this image ON the EC2 host (amd64) so sharp's native prebuilt binary
# matches the runtime architecture.

# ---- builder: full deps + Nx build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy the lockfile first so this layer is cached unless deps change — the full
# monorepo `npm ci` is heavy and should not re-run on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

# Now copy the rest of the repo (filtered by .dockerignore). We must bring the
# WHOLE root context, not just apps/ + libs/: Nx's project-graph plugins read
# root config such as eslint.config.mjs (imported by apps/backend/eslint.config.mjs),
# and a missing root config breaks graph processing (surfaces as
# "No inputs were found in config file 'tsconfig.json'").
COPY . .

# Builds db + api-types (dependsOn ^build) then backend -> dist/apps/backend
RUN npx nx build backend --configuration=production

# Install only the runtime npm deps the built backend imports, into its own
# output dir (the generated package.json/lock there drive this). dist/apps/backend
# is self-contained: main.js resolves @plant-doctor/* to sibling libs/ paths, and
# npm packages resolve from this node_modules.
WORKDIR /app/dist/apps/backend
RUN npm ci --omit=dev --no-audit --no-fund

# ---- runtime: lean, self-contained ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/backend ./

EXPOSE 4100
CMD ["node", "main.js"]