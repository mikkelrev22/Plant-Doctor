/**
 * Single source of truth for the backend version.
 *
 * Surfaced via `GET /` (API-key exempt) so the mobile login screen can show it,
 * and patch-bumped by `scripts/bump-versions.mjs` on any commit touching
 * `apps/backend/`. Kept as a plain constant rather than read from a package.json
 * so it stays decoupled from the Nx build machinery as the architecture changes.
 */
export const BACKEND_VERSION = '0.1.1';
