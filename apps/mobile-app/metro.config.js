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

// Namespace the Metro transform cache by NODE_ENV so development and production
// never share cached transforms. `EXPO_PUBLIC_*` vars (e.g. EXPO_PUBLIC_API_URL)
// are inlined into the bundle at transform time, but the cache key does NOT
// include their resolved values — so a `client.ts` transform cached during
// `expo start` (NODE_ENV=development, LAN URL) could otherwise be reused by
// `eas update` / `expo export` (NODE_ENV=production), leaking the local URL
// into a published Expo Go update. Expo sets NODE_ENV before loading this
// config (development for `expo start`, production for export), so this gives
// each mode its own cache and removes the need to remember `--clear-cache`.
config.cacheVersion = `${config.cacheVersion}-${process.env.NODE_ENV || 'development'}`;

config.watchFolders = [path.resolve(monorepoRoot, 'libs')];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@plant-doctor/api-types': path.resolve(
    monorepoRoot,
    'libs/api-types/src/index.ts',
  ),
};

// Zustand's ESM build (esm/index.mjs and friends) references `import.meta.env`
// for dev-only checks. Metro does not transform `import.meta` for the web
// target, and with package `exports` enabled (SDK 54 default) the web build
// resolves zustand to that ESM entry. expo-router's static web output then
// loads the bundle as a classic (non-module) <script>, so the browser throws
// "Cannot use 'import.meta' outside a module". Force zustand and its
// subpaths to the CommonJS build (which uses process.env.NODE_ENV instead).
// Native already resolves to CJS via the `react-native` export condition, so
// this effectively only changes the web resolution.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName) };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;