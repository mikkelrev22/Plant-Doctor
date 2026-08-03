import { beforeEach, describe, expect, it, vi } from 'vitest';

// Control Platform.OS across tests (the client branches FormData between
// native and web).
const platform = vi.hoisted(() => ({ os: 'web' as 'web' | 'ios' }));
vi.mock('react-native', () => ({
  Platform: { get OS() { return platform.os; } },
}));

import { analyzeReport, ApiError, listPlants, updatePlantName } from './client';

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }): Response {
  const status = init?.status ?? 200;
  return {
    ok: init?.ok ?? (status >= 200 && status < 300),
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)], { type: 'image/jpeg' }),
  } as Response;
}

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    platform.os = 'web';
  });

  it('sends the x-api-key header and parses JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1, name: 'Aloe' }]));
    const plants = await listPlants();
    expect(plants).toEqual([{ id: 1, name: 'Aloe' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4100/plants');
    expect((init as RequestInit).method).toBeUndefined();
    expect((init as RequestInit).headers).toMatchObject({ 'x-api-key': 'test-key' });
  });

  it('PATCH updatePlantName sends a JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Renamed' }));
    await updatePlantName(1, 'Renamed');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4100/plants/1');
    expect((init as RequestInit).method).toBe('PATCH');
    expect((init as RequestInit).body).toBe(JSON.stringify({ name: 'Renamed' }));
    expect((init as RequestInit).headers).toMatchObject({
      'x-api-key': 'test-key',
      'content-type': 'application/json',
    });
  });

  it('throws ApiError on non-2xx with the server message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Bad Request', message: 'Name required' }, { status: 400 }),
    );
    await expect(updatePlantName(1, 'x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Name required',
    });
    expect(new ApiError(400, 'msg').status).toBe(400);
  });

  it('analyzeReport builds multipart FormData and appends plantId', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ plant: { id: 1 }, report: { id: 9 } }));
    await analyzeReport({ imageUri: 'file:///x.jpg', mimeType: 'image/jpeg', plantId: 5 });
    // The web branch fetches the image URI first; the POST is the last call.
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('http://localhost:4100/reports/analyze');
    expect((init as RequestInit).method).toBe('POST');
    const form = (init as RequestInit).body as FormData;
    expect(form.get('plantId')).toBe('5');
    // Image part is present (a Blob on web); never set Content-Type manually.
    expect(form.get('image')).toBeInstanceOf(Blob);
    expect((init as RequestInit).headers).not.toHaveProperty('content-type');
  });

  it('analyzeReport omits plantId when not provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ plant: { id: 1 }, report: { id: 9 } }));
    await analyzeReport({ imageUri: 'file:///x.jpg', mimeType: 'image/jpeg' });
    const form = (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as FormData;
    expect(form.get('plantId')).toBeNull();
  });
});