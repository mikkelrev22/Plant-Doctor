// Runs before each backend test file. Gives every test a non-empty shared API
// key so the api-key plugin's fail-closed gate doesn't 401 on gated requests
// in other spec files (e.g. app.spec.ts). api-key.spec.ts overrides this per
// test to exercise the fail-closed path.
process.env.BACKEND_API_KEY = 'test-api-key';