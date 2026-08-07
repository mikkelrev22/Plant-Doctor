jest.mock('@plant-doctor/db', () => ({
  createDatabaseClient: () => ({
    db: {},
    close: jest.fn(),
  }),
}));

import Fastify, { FastifyInstance } from 'fastify';
import { app } from './app';
import { BACKEND_VERSION } from '../version';

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
