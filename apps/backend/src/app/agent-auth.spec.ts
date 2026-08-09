import Fastify, { type FastifyInstance } from 'fastify';
import { agentAuthHook } from './services/agent-auth';
import type { Chat } from '@plant-doctor/db';

// Mock the chat lookup so the hook can be tested without a database. The db
// argument is ignored by the mock.
jest.mock('./services/chats.service', () => ({
  getChatByToken: jest.fn(),
}));

const { getChatByToken } = require('./services/chats.service') as {
  getChatByToken: jest.Mock;
};

function buildServer(): FastifyInstance {
  const server = Fastify();
  server.addHook('preHandler', agentAuthHook);

  // Token-gated route (no config → requireChatToken is not false).
  server.get('/gated', async (request) => ({
    chatId: request.chat?.id ?? null,
  }));

  // Exempt route — mirrors createChat's `config.requireChatToken: false`.
  server.post(
    '/open',
    { config: { requireChatToken: false } },
    async () => ({ ok: true }),
  );

  return server;
}

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 42,
    chatToken: 'valid-token',
    userId: 1,
    plantId: 7,
    defaultReportId: 99,
    history: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('agentAuthHook', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    getChatByToken.mockReset();
    server = buildServer();
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('rejects a gated request with no chat token (401)', async () => {
    const res = await server.inject({ method: 'GET', url: '/gated' });
    expect(res.statusCode).toBe(401);
    expect(getChatByToken).not.toHaveBeenCalled();
  });

  it('rejects an invalid chat token (401)', async () => {
    getChatByToken.mockResolvedValue(null);
    const res = await server.inject({
      method: 'GET',
      url: '/gated',
      headers: { 'x-chat-token': 'bogus' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('attaches the chat and allows the request for a valid token', async () => {
    const chat = makeChat();
    getChatByToken.mockResolvedValue(chat);
    const res = await server.inject({
      method: 'GET',
      url: '/gated',
      headers: { 'x-chat-token': 'valid-token' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ chatId: 42 });
    // The hook passes request.server.db (undefined in this isolated test) as
    // the first arg and the token as the second — assert the token directly.
    expect(getChatByToken).toHaveBeenCalledTimes(1);
    expect(getChatByToken.mock.calls[0][1]).toBe('valid-token');
  });

  it('exempts routes with requireChatToken: false (no token needed)', async () => {
    const res = await server.inject({ method: 'POST', url: '/open' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(getChatByToken).not.toHaveBeenCalled();
  });
});