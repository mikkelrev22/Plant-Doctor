import Fastify, { FastifyInstance } from 'fastify';
import apiKey from './plugins/api-key';
import { config } from '../config';

/**
 * Exercises the static API-key gate in isolation. Uses a minimal Fastify
 * instance with only the plugin + dummy routes (no DB, no CORS) so the
 * assertions reflect the gate's behaviour alone.
 *
 * Note: this file lives next to app.spec.ts (NOT in plugins/) because
 * @fastify/autoload registers every file in src/app/plugins/ as a Fastify
 * plugin — a spec there would be auto-loaded and break the app.
 *
 * `config.apiKey` is read at request time, so tests mutate it directly.
 */
describe('api-key plugin', () => {
  const originalKey = config.apiKey;
  let server: FastifyInstance;

  function build(): FastifyInstance {
    const app = Fastify();
    app.register(apiKey);
    app.get('/', async () => ({ ok: true }));
    app.get('/plants', async () => ({ ok: true }));
    app.get('/uploads/plant-photos/x', async () => ({ ok: true }));
    return app;
  }

  beforeEach(async () => {
    (config as { apiKey: string }).apiKey = 'test-api-key';
    server = build();
    await server.ready();
  });

  afterEach(async () => {
    (config as { apiKey: string }).apiKey = originalKey;
    await server.close();
  });

  it('rejects gated requests without the header', async () => {
    const res = await server.inject({ method: 'GET', url: '/plants' });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/API key/i);
  });

  it('rejects a wrong key', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/plants',
      headers: { 'x-api-key': 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts the correct key', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/plants',
      headers: { 'x-api-key': 'test-api-key' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('is fail-closed when the key is unset', async () => {
    (config as { apiKey: string }).apiKey = '';
    const res = await server.inject({
      method: 'GET',
      url: '/plants',
      headers: { 'x-api-key': 'test-api-key' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('exempts the health route', async () => {
    const res = await server.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
  });

  it('exempts /uploads/* (no header needed)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/uploads/plant-photos/x',
    });
    expect(res.statusCode).toBe(200);
  });

  it('exempts OPTIONS preflight', async () => {
    const res = await server.inject({ method: 'OPTIONS', url: '/plants' });
    expect(res.statusCode).not.toBe(401);
  });
});