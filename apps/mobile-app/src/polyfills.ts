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
 * Because the guard already proves the global is absent, we assign directly to
 * `globalThis` instead of reaching into `react-native`'s private
 * `PolyfillFunctions` (a deprecated deep import that warns on Metro).
 *
 * Note on `@ungap/structured-clone`: it is the AI SDK / Expo-blessed polyfill,
 * but its package is `"type": "module"` and Metro (SDK 54, package exports
 * enabled) mis-parses its CJS entry as an ES module, throwing
 * `Object.defineProperty() called on non-object` at `require()` time.
 * `metro.config.js` resolves the package to its ESM build to work around this.
 * If that resolution ever regresses, the `try/catch` below falls back to a JSON
 * round-trip clone — sufficient for the AI SDK's plain-JSON chat state and free
 * of the deprecated deep import into `react-native`'s private structuredClone.
 */
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  if (typeof globalThis.structuredClone !== 'function') {
    let clone: (value: any) => any;
    try {
      clone = require('@ungap/structured-clone').default;
    } catch {
      // @ungap failed to load under Metro; fall back to a JSON round-trip
      // clone so the app still boots. The AI SDK's chat state is plain
      // JSON-serializable data, so this is adequate as a last resort.
      clone = (value: any) => JSON.parse(JSON.stringify(value));
    }
    globalThis.structuredClone = clone;
  }

  if (
    typeof globalThis.TextEncoderStream !== 'function' ||
    typeof globalThis.TextDecoderStream !== 'function'
  ) {
    const { TextEncoderStream, TextDecoderStream } = require(
      '@stardazed/streams-text-encoding',
    );
    globalThis.TextEncoderStream = TextEncoderStream;
    globalThis.TextDecoderStream = TextDecoderStream;
  }
} else if (process.env.NODE_ENV !== 'production') {
  // Web (dev only): `@react-navigation/elements`' Header and
  // `react-native-screens`' ScreenStackHeaderConfig still pass `pointerEvents`
  // as a prop, which react-native-web deprecated in favour of
  // `style.pointerEvents` and emits via `warnOnce` (once per session, dev only).
  // It's third-party code we can't edit, and the latest upstream releases
  // (@react-navigation/elements 2.9.38, react-native-screens 4.27.0) still pass
  // it as a prop, so filter just this one message to keep the console clean.
  // Our own code uses `style.pointerEvents` (see ImageSourcePicker), so this
  // won't mask regressions in app code.
  const originalWarn = console.warn;
  const blocked = 'props.pointerEvents is deprecated. Use style.pointerEvents';
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(blocked)) return;
    originalWarn.apply(console, args as never);
  };
}