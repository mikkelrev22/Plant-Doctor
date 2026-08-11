import type { Database } from '@plant-doctor/db';
import { BadRequestError, NotFoundError } from '../errors';

// Mock the sibling services `createChat` depends on so the spec exercises only
// the report-resolution + validation logic, not real queries.
jest.mock('./plants.service', () => ({
  getPlantForUser: jest.fn(),
}));
jest.mock('./reports.service', () => ({
  getReportDetail: jest.fn(),
}));
jest.mock('./agent-format.service', () => ({
  formatLatestReportContext: jest.fn((_plant: unknown, _report: unknown) => 'CTX'),
}));

import { createChat } from './chats.service';
import { getPlantForUser } from './plants.service';
import { getReportDetail } from './reports.service';

const getPlant = getPlantForUser as jest.Mock;
const getReport = getReportDetail as jest.Mock;

const PLANT = { id: 1, name: 'Aloe', species: null, notes: null, createdAt: new Date(), updatedAt: new Date() };
const baseDate = new Date('2024-01-01T00:00:00.000Z');

/** Chainable thenable mirroring `db.select(...).from().where().orderBy().limit()`. */
class Chain<T> {
  constructor(private value: T) {}
  from = () => this;
  where = () => this;
  orderBy = () => this;
  limit = () => this;
  then<U>(onFulfilled: (v: T) => U | PromiseLike<U>): PromiseLike<U> {
    return Promise.resolve(this.value).then(onFulfilled) as unknown as PromiseLike<U>;
  }
}

/** A report DTO stub carrying the fields `createChat` inspects. */
function report(id: number, plantId: number) {
  return {
    id,
    plantId,
    plantName: 'Aloe',
    reportedAt: baseDate,
    identifiedPlantName: 'Aloe vera',
    scientificName: 'Aloe vera',
    identificationConfidence: 90,
    likelyStressors: [],
    summary: '',
    recommendations: '',
    photo: null,
    stressSigns: [],
    llmRequest: null,
  };
}

/** Minimal `db` with a `select` chain (for the latest-report lookup) and an
 *  `insert(...).values(...)` thenable. */
function makeDb(latestReportRows: unknown[]) {
  return {
    select: () => new Chain(latestReportRows.shift()),
    insert: () => ({ values: () => Promise.resolve() }),
  } as unknown as Database;
}

beforeEach(() => {
  jest.clearAllMocks();
  getPlant.mockResolvedValue(PLANT);
});

describe('createChat — reportId pinning', () => {
  it('pins the chat to the requested report when it belongs to the plant', async () => {
    getReport.mockResolvedValue(report(99, 1));
    // The latest-report select() is skipped when reportId is provided.
    const db = makeDb([]);

    const result = await createChat(db, { plantId: 1, reportId: 99 });

    expect(getReport).toHaveBeenCalledWith(expect.anything(), 99);
    expect(result.defaultReportId).toBe(99);
    expect(result.contextText).toBe('CTX');
  });

  it('throws BadRequestError when the report belongs to a different plant', async () => {
    getReport.mockResolvedValue(report(99, 2)); // plantId 2, not 1
    const db = makeDb([]);

    await expect(createChat(db, { plantId: 1, reportId: 99 })).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('throws NotFoundError when the report does not exist (or is not the user\'s)', async () => {
    getReport.mockResolvedValue(null); // getReportDetail scopes to Research User → null
    const db = makeDb([]);

    await expect(createChat(db, { plantId: 1, reportId: 999 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('falls back to the latest report when no reportId is given', async () => {
    // First (and only) select() resolves to the latest-report id row.
    const db = makeDb([[{ id: 42 }]]);
    getReport.mockResolvedValue(report(42, 1));

    const result = await createChat(db, { plantId: 1 });

    expect(getReport).toHaveBeenCalledWith(expect.anything(), 42);
    expect(result.defaultReportId).toBe(42);
  });

  it('uses null defaultReportId when the plant has no reports and no reportId is given', async () => {
    const db = makeDb([[]]); // no latest report
    const result = await createChat(db, { plantId: 1 });
    expect(result.defaultReportId).toBeNull();
  });

  it('throws NotFoundError when the plant does not exist', async () => {
    getPlant.mockResolvedValue(null);
    const db = makeDb([]);

    await expect(createChat(db, { plantId: 1, reportId: 99 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});