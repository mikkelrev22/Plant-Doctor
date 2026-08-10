jest.mock('@plant-doctor/db', () => ({
  createDatabaseClient: () => ({
    db: {},
    close: jest.fn(),
  }),
}));

// Mock plants.service so the /plants/evals shadowing-guard test (below) can
// assert a 200 without a real drizzle db. Only listPlantsForEval needs a real
// return value; the rest are stubs (no other test in this file reaches them).
jest.mock('./services/plants.service', () => ({
  createPlant: jest.fn(),
  getPlantForUser: jest.fn(),
  listPlants: jest.fn(),
  updatePlant: jest.fn(),
  listPlantsForEval: jest.fn(async () => [{ id: 1, name: 'Test Plant' }]),
  findOrCreatePlant: jest.fn(),
  updatePlantName: jest.fn(),
  updatePlantSpecies: jest.fn(),
}));

// These integration specs exercise route wiring, not image/S3 IO. Stub the two
// heaviest cold-load leaves (native `sharp` + the large `@aws-sdk/client-s3` via
// storage) so the first server.ready() stays well under Jest's 60s hook budget.
// uploads.service.spec.ts keeps the real sharp (separate worker).
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./services/storage', () => ({
  storage: {
    putObject: jest.fn(),
    getObject: jest.fn(),
    deleteObject: jest.fn(),
    publicUrl: jest.fn(),
  },
}));

import Fastify, { FastifyInstance } from 'fastify';
import { app } from './app';
import { BACKEND_VERSION } from '../version';

// The first `server.ready()` pays the @fastify/autoload cost: it dynamically
// imports every plugin + route (sharp, drizzle, the LLM SDK, zod, …). On a
// cold/slow runner (e.g. CI's 2-core ubuntu-latest) that first registration
// can take well over Jest's 5s default and time out the beforeEach. 60s gives
// it headroom; subsequent tests reuse the now-cached modules and stay fast.
jest.setTimeout(60000);

describe('GET /', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify();
    await server.register(app);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should respond with a message', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.json()).toEqual({
      message: 'Node.js backend is running',
      version: BACKEND_VERSION,
    });
  });

  it('should return 400 for invalid reportId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/reports/abc',
      headers: { 'x-api-key': 'test-api-key' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should not shadow /plants/evals with the parametric /plants/:plantId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/plants/evals',
      headers: { 'x-api-key': 'test-api-key' },
    });

    // /plants/evals lives in the admin group and /plants/:plantId in the
    // consumer group. app.ts registers admin BEFORE consumer so the static
    // /plants/evals path isn't shadowed by the parametric route. If it were,
    // `plantId: 'evals'` would fail the plantIdParams number coercion and
    // return 400. Reaching the evals handler returns 200 with the mocked list.
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 1, name: 'Test Plant' }]);
  });

  it('should allow PATCH method in CORS preflight', async () => {
    const response = await server.inject({
      method: 'OPTIONS',
      url: '/plants/1',
      headers: {
        'Access-Control-Request-Method': 'PATCH',
        Origin: 'http://localhost:4500', // One of the allowed origins in config.ts
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });
});
