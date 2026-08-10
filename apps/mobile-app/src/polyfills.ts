/**
 * Runtime polyfills the AI SDK (`useChat` / `@ai-sdk/react`) needs on React
 * Native / Hermes. On web these APIs are native, so the polyfills are applied on
 * native only. Import this module first in `src/app/_layout.tsx`.
 *
 * The AI SDK calls the *global* `structuredClone`, `TextEncoderStream`, and
 * `TextDecoderStream` directly — it never imports these packages — so the job
 * here is simply to install working globals.
 *
 * Each polyfill is guarded: if the global already exists (Expo/Hermes ship some
 * via `expo/fetch`'s winter runtime) it's left alone, so this is a no-op there.
 *
 * Note on `@ungap/structured-clone`: it is the AI SDK / Expo-blessed polyfill,
 * but its package is `"type": "module"` and Metro (SDK 54, package exports
 * enabled) mis-parses its CJS entry as an ES module, throwing
 * `Object.defineProperty() called on non-object` at `require()` time.
 * `metro.config.js` resolves the package to its ESM build to work around this;
 * the `try/catch` below additionally falls back to RN 0.81's own built-in
 * `structuredClone` so the app still boots if that resolution ever regresses.
 */
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');

  if (typeof globalThis.structuredClone !== 'function') {
    let clone: { default: (value: any) => any };
    try {
      clone = require('@ungap/structured-clone');
    } catch {
      // @ungap failed to load under Metro; use RN's built-in instead.
      clone = { default: require('react-native/src/private/webapis/structuredClone/structuredClone').default };
    }
    polyfillGlobal('structuredClone', () => clone.default);
  }

  if (
    typeof globalThis.TextEncoderStream !== 'function' ||
    typeof globalThis.TextDecoderStream !== 'function'
  ) {
    const { TextEncoderStream, TextDecoderStream } = require(
      '@stardazed/streams-text-encoding',
    );
    polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
    polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
  }
}