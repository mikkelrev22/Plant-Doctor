#!/usr/bin/env node
/**
 * Pre-commit version bumper.
 *
 * Patch-bumps the version of any app with staged changes and re-stages the bumped
 * files so the bump lands in the same commit:
 *   - apps/mobile-app/  → `expo.version` in app.json + `version` in package.json
 *   - apps/backend/     → BACKEND_VERSION in src/version.ts
 *
 * Skipped entirely when SKIP_VERSION_BUMP=1. Never aborts the commit on a parse
 * failure — it just warns and skips that file.
 *
 * Invoked by scripts/hooks/pre-commit.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

if (process.env.SKIP_VERSION_BUMP === '1') {
  console.log('bump: skipped (SKIP_VERSION_BUMP=1)');
  process.exit(0);
}

/** List of staged paths (as-is, repo-relative). */
const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const hasMobile = staged.some((p) => p.startsWith('apps/mobile-app/'));
const hasBackend = staged.some((p) => p.startsWith('apps/backend/'));

if (!hasMobile && !hasBackend) {
  process.exit(0);
}

/** Bump the patch segment of an `x.y.z` string; returns null if not semver. */
function bumpPatch(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

/**
 * Patch-bump the first `x.y.z` matched by `pattern` in `relPath` and `git add` it.
 * `label` is used for the audit print. Keeps formatting intact (no JSON re-encode).
 */
function bumpInFile(relPath, pattern, label) {
  const abs = resolve(REPO, relPath);
  let contents;
  try {
    contents = readFileSync(abs, 'utf8');
  } catch {
    console.warn(`bump: ${label} — ${relPath} not found, skipping`);
    return;
  }
  const match = pattern.exec(contents);
  if (!match) {
    console.warn(`bump: ${label} — no version string found in ${relPath}, skipping`);
    return;
  }
  const current = match[1];
  const next = bumpPatch(current);
  if (!next) {
    console.warn(`bump: ${label} — "${current}" is not semver, skipping`);
    return;
  }
  const replaced = contents.slice(0, match.index) +
    match[0].replace(current, next) +
    contents.slice(match.index + match[0].length);
  writeFileSync(abs, replaced);
  execSync(`git add "${relPath}"`, { stdio: 'ignore' });
  console.log(`bump: ${label} ${current} → ${next} (${relPath})`);
}

if (hasMobile) {
  // `expo.version` in app.json is the first `"version": "x.y.z"` in the file
  // (nested under `expo`); package.json's top-level `version` is likewise first.
  bumpInFile('apps/mobile-app/app.json', /"version":\s*"(\d+\.\d+\.\d+)"/, 'app');
  bumpInFile('apps/mobile-app/package.json', /"version":\s*"(\d+\.\d+\.\d+)"/, 'app(pkg)');
}

if (hasBackend) {
  bumpInFile('apps/backend/src/version.ts', /BACKEND_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/, 'backend');
}