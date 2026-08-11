// Mock the db client the db plugin decorates onto Fastify — no real Postgres.
jest.mock('@plant-doctor/db', () => ({
  createDatabaseClient: () => ({ db: {}, close: jest.fn() }),
}));

// Mock the chat lifecycle service: getChatByToken drives the preHandler; the
// rest are stubs returning recognizable payloads.
jest.mock('./services/chats.service', () => ({
  createChat: jest.fn(async () => ({
    chatToken: 'new-token',
    contextText: 'CONTEXT',
    plantId: 1,
    plantName: 'Aloe',
    defaultReportId: 10,
  })),
  getChat: jest.fn(async () => ({
    chatToken: 'test-token',
    plantId: 1,
    plantName: 'Aloe',
    defaultReportId: 10,
    history: [{ role: 'user', content: 'hi' }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  })),
  saveChat: jest.fn(async () => undefined),
  listChatsByPlant: jest.fn(async () => [
    {
      id: 42,
      chatToken: 'test-token',
      plantId: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      lastMessagePreview: 'hi',
    },
  ]),
  getChatByToken: jest.fn(async (_db: unknown, token: string) =>
    token === 'test-token'
      ? {
          id: 42,
          chatToken: 'test-token',
          userId: 1,
          plantId: 1,
          defaultReportId: 10,
          history: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }
      : null,
  ),
}));

// Mock the tool orchestration so routes can be exercised without the LLM/DB.
jest.mock('./services/agent-tools.service', () => ({
  agentPlantReports: jest.fn(async () => 'REPORTS_TEXT'),
  agentPlantHistory: jest.fn(async () => 'HISTORY_TEXT'),
  agentUserPlants: jest.fn(async () => 'PLANTS_TEXT'),
  agentLookAtPhoto: jest.fn(async () => 'PHOTO_ANSWER'),
  logAgentEvent: jest.fn(async () => undefined),
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

import Fastify, { type FastifyInstance } from 'fastify';
import { app } from './app';
const chatsService = require('./services/chats.service') as {
  createChat: jest.Mock;
  getChat: jest.Mock;
  saveChat: jest.Mock;
  listChatsByPlant: jest.Mock;
  getChatByToken: jest.Mock;
};
const toolsService = require('./services/agent-tools.service') as Record<
  string,
  jest.Mock
>;

jest.setTimeout(60000);

const API_KEY = { 'x-api-key': 'test-api-key' };
const CHAT_TOKEN = { 'x-chat-token': 'test-token' };

describe('/agent endpoints', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = Fastify();
    await server.register(app);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('POST /agent/chats creates a chat without a chat token (only x-api-key)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/agent/chats',
      headers: { ...API_KEY, 'content-type': 'application/json' },
      payload: { plantId: 1 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ chatToken: 'new-token', contextText: 'CONTEXT' });
    expect(chatsService.createChat).toHaveBeenCalled();
    // Exempt route → preHandler must not look up a chat token.
    expect(chatsService.getChatByToken).not.toHaveBeenCalled();
  });

  it('GET /agent/plantReports returns plain text for a valid chat token', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/agent/plantReports',
      headers: { ...API_KEY, ...CHAT_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toBe('REPORTS_TEXT');
    expect(toolsService.agentPlantReports).toHaveBeenCalled();
    // Tool logging happens inside agentPlantReports via withAgentEvent — the
    // route itself does not call logAgentEvent, so we assert on the tool mock.
  });

  it('GET /agent/plantReports rejects a missing chat token (401)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/agent/plantReports',
      headers: { ...API_KEY },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /agent/plantReports rejects an invalid chat token (401)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/agent/plantReports',
      headers: { ...API_KEY, 'x-chat-token': 'bogus' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /agent/userPlants and /agent/plantHistory return plain text', async () => {
    const plants = await server.inject({
      method: 'GET',
      url: '/agent/userPlants',
      headers: { ...API_KEY, ...CHAT_TOKEN },
    });
    expect(plants.statusCode).toBe(200);
    expect(plants.body).toBe('PLANTS_TEXT');

    const history = await server.inject({
      method: 'GET',
      url: '/agent/plantHistory',
      headers: { ...API_KEY, ...CHAT_TOKEN },
    });
    expect(history.statusCode).toBe(200);
    expect(history.body).toBe('HISTORY_TEXT');
  });

  it('POST /agent/lookAtPhoto returns the LLM answer as plain text', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/agent/lookAtPhoto',
      headers: { ...API_KEY, ...CHAT_TOKEN, 'content-type': 'application/json' },
      payload: { query: 'Are the leaves yellow?' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toBe('PHOTO_ANSWER');
  });

  it('POST /agent/lookAtPhoto returns 400 when query is missing', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/agent/lookAtPhoto',
      headers: { ...API_KEY, ...CHAT_TOKEN, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /agent/chats/:chatToken returns the saved history', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/agent/chats/test-token',
      headers: { ...API_KEY, ...CHAT_TOKEN },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ chatToken: 'test-token', plantName: 'Aloe' });
    expect(chatsService.getChat).toHaveBeenCalled();
  });

  it('PUT /agent/chats/:chatToken saves history and returns 204', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/agent/chats/test-token',
      headers: { ...API_KEY, ...CHAT_TOKEN, 'content-type': 'application/json' },
      payload: { history: [{ role: 'user', content: 'hi' }] },
    });
    expect(res.statusCode).toBe(204);
    expect(chatsService.saveChat).toHaveBeenCalled();
  });

  it('GET /agent/plants/:plantId/chats lists chats without a chat token (only x-api-key)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/agent/plants/1/chats',
      headers: { ...API_KEY },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({ chatToken: 'test-token', lastMessagePreview: 'hi' }),
    ]);
    expect(chatsService.listChatsByPlant).toHaveBeenCalledWith(expect.anything(), { plantId: 1 });
    // Exempt route → preHandler must not look up a chat token.
    expect(chatsService.getChatByToken).not.toHaveBeenCalled();
  });
});