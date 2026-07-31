# Multi-stage build for the Plant-Doctor backend (Fastify + Drizzle + sharp).
#
# Build this image ON the EC2 host (amd64) so sharp's native prebuilt binary
# matches the runtime architecture.

# ---- builder: full deps + Nx build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy only what the build needs. The backend is an Nx project that shares
# libs/ and root tsconfig/nx config; there is no per-app package.json.
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/ libs/ ./

RUN npm ci

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