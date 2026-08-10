/**
 * Runtime polyfills the AI SDK (`useChat` / `@ai-sdk/react`) needs on React
 * Native / Hermes. On web these APIs are native, so the polyfills are applied on
 * native only. Import this module first in `src/app/_layout.tsx`.
 *
 * Per the AI SDK Expo guide:
 *  - `@ungap/structured-clone`            -> structuredClone
 *  - `@stardazed/streams-text-encoding`   -> TextEncoderStream / TextDecoderStream
 *
 * Expo SDK 54's runtime already ships several of these (via `expo/fetch`); each
 * polyfill is guarded so it's a no-op when the global already exists.
 */
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');
  const structuredClone = require('@ungap/structured-clone');
  const { TextEncoderStream, TextDecoderStream } = require(
    '@stardazed/streams-text-encoding',
  );

  polyfillGlobal('structuredClone', () => structuredClone);
  polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
  polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
}