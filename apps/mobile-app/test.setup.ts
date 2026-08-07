/**
 * Runs before any test module is evaluated, so the API client's build-time env
 * reads (`process.env.EXPO_PUBLIC_*`) see deterministic values.
 */
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4100';
process.env.EXPO_PUBLIC_BACKEND_API_KEY = 'test-key';