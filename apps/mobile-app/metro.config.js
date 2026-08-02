const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro config for the Plant-Doctor mobile app.
 *
 * The app imports TypeScript DTOs from the shared monorepo library
 * `@plant-doctor/api-types` (libs/api-types/src/index.ts). That library is NOT
 * an npm-workspaces package (the repo has no `workspaces` field), so the bare
 * specifier would be unresolvable without help:
 *   - `watchFolders` lets Metro observe and hot-reload the shared TS source.
 *   - `extraNodeModules` maps the bare specifier to the source file. The tsconfig
 *     `paths` entry only helps the type-checker/editor, not the bundler.
 *
 * Watching only `libs/` (not the whole monorepo) keeps Metro fast and avoids
 * indexing the root node_modules; the app's own node_modules stays the primary
 * resolver so there's no risk of duplicate React/React Native copies.
 */
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(monorepoRoot, 'libs')];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@plant-doctor/api-types': path.resolve(
    monorepoRoot,
    'libs/api-types/src/index.ts',
  ),
};

module.exports = config;