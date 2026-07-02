#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DEFAULT_DATABASE_URL="postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-plant-doctor-postgres}"
RESET_DB=false

for arg in "$@"; do
  case "$arg" in
    --reset-db) RESET_DB=true ;;
    -h|--help)
      cat <<'EOF'
Usage: ./install.sh [--reset-db]

  --reset-db  Remove the local PostgreSQL container and data volume, then reinstall.
              Use this after the initial migration was replaced or your local schema
              no longer matches libs/db/migrations/.
EOF
      exit 0
      ;;
    *)
      fail "Unknown argument: $arg (try ./install.sh --help)"
      ;;
  esac
done

log() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

load_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return
  fi

  if [[ ! -f ".env" && -f ".env.example" ]]; then
    log "Creating .env from .env.example"
    cp ".env.example" ".env"
  fi

  if [[ -f ".env" ]]; then
    while IFS='=' read -r key value; do
      if [[ "$key" == "DATABASE_URL" ]]; then
        DATABASE_URL="${value%$'\r'}"
        DATABASE_URL="${DATABASE_URL%\"}"
        DATABASE_URL="${DATABASE_URL#\"}"
        DATABASE_URL="${DATABASE_URL%\'}"
        DATABASE_URL="${DATABASE_URL#\'}"
        export DATABASE_URL
        return
      fi
    done < ".env"
  fi

  DATABASE_URL="$DEFAULT_DATABASE_URL"
  export DATABASE_URL
}

parse_database_url() {
  local url_without_protocol credentials host_port_db host_port

  case "$DATABASE_URL" in
    postgres://*) url_without_protocol="${DATABASE_URL#postgres://}" ;;
    postgresql://*) url_without_protocol="${DATABASE_URL#postgresql://}" ;;
    *) fail "DATABASE_URL must start with postgres:// or postgresql://" ;;
  esac

  credentials="${url_without_protocol%@*}"
  host_port_db="${url_without_protocol#*@}"

  if [[ "$credentials" == "$url_without_protocol" || "$host_port_db" == "$url_without_protocol" ]]; then
    fail "DATABASE_URL must include user, password, host, port, and database"
  fi

  DB_USER="${credentials%%:*}"
  DB_PASSWORD="${credentials#*:}"
  host_port="${host_port_db%%/*}"
  DB_NAME="${host_port_db#*/}"
  DB_NAME="${DB_NAME%%\?*}"
  DB_HOST="${host_port%%:*}"
  DB_PORT="${host_port#*:}"

  if [[ "$DB_PORT" == "$host_port" ]]; then
    DB_PORT="5432"
  fi

  [[ -n "$DB_USER" ]] || fail "DATABASE_URL user is empty"
  [[ -n "$DB_PASSWORD" ]] || fail "DATABASE_URL password is empty"
  [[ -n "$DB_HOST" ]] || fail "DATABASE_URL host is empty"
  [[ -n "$DB_PORT" ]] || fail "DATABASE_URL port is empty"
  [[ -n "$DB_NAME" ]] || fail "DATABASE_URL database name is empty"
}

container_exists() {
  docker container inspect "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1
}

container_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER_NAME" 2>/dev/null || true)" == "true" ]]
}

reset_local_database() {
  log "Resetting local PostgreSQL data"

  if container_running; then
    docker stop "$POSTGRES_CONTAINER_NAME" >/dev/null
  fi

  if container_exists; then
    docker rm "$POSTGRES_CONTAINER_NAME" >/dev/null
  fi

  docker volume rm "${POSTGRES_CONTAINER_NAME}-data" >/dev/null 2>&1 || true
}

wait_for_postgres() {
  log "Waiting for PostgreSQL to accept connections"

  for _ in {1..60}; do
    if docker exec \
      -e PGPASSWORD="$DB_PASSWORD" \
      "$POSTGRES_CONTAINER_NAME" \
      psql -U "$DB_USER" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "PostgreSQL did not become ready within 60 seconds"
}

ensure_database() {
  log "Ensuring database '$DB_NAME' exists"

  for _ in {1..30}; do
    local exists create_output

    exists="$(docker exec \
      -e PGPASSWORD="$DB_PASSWORD" \
      "$POSTGRES_CONTAINER_NAME" \
      psql -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null |
      tr -d '[:space:]' || true)"

    if [[ "$exists" == "1" ]]; then
      return
    fi

    if create_output="$(docker exec \
      -e PGPASSWORD="$DB_PASSWORD" \
      "$POSTGRES_CONTAINER_NAME" \
      createdb -U "$DB_USER" "$DB_NAME" 2>&1)"; then
      return
    fi

    if echo "$create_output" | grep -qi 'already exists'; then
      return
    fi

    sleep 1
  done

  fail "Could not ensure database '$DB_NAME' exists"
}

require_command docker
require_command npm

load_database_url
parse_database_url

if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" ]]; then
  fail "install.sh manages a local Docker database, but DATABASE_URL host is '$DB_HOST'"
fi

if [[ "$RESET_DB" == "true" ]]; then
  reset_local_database
fi

log "Pulling PostgreSQL image: $POSTGRES_IMAGE"
docker pull "$POSTGRES_IMAGE"

if container_exists; then
  if container_running; then
    log "Reusing running container: $POSTGRES_CONTAINER_NAME"
  else
    log "Starting existing container: $POSTGRES_CONTAINER_NAME"
    docker start "$POSTGRES_CONTAINER_NAME" >/dev/null
  fi
else
  log "Creating PostgreSQL container: $POSTGRES_CONTAINER_NAME"
  docker run -d \
    --name "$POSTGRES_CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT:5432" \
    -v "${POSTGRES_CONTAINER_NAME}-data:/var/lib/postgresql/data" \
    "$POSTGRES_IMAGE" >/dev/null
fi

wait_for_postgres
ensure_database

if [[ ! -d "node_modules" ]]; then
  log "Installing npm dependencies"
  npm install
fi

log "Running database migrations"
if ! npx nx run db:migrate; then
  fail "Database migration failed. If the initial migration changed, reset local data and retry: ./install.sh --reset-db"
fi

log "PostgreSQL is ready and migrations are applied"
