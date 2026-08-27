/**
 * Tests for app/utils/data/operations/confirmation-summary-operations.ts
 *
 * Validates that confirmation summaries are correctly created, updated, removed,
 * and moved — specifically to prevent orphaned summary entries.
 *
 * External dependencies (fetchDataApi, validateUserSession, canAccessCase) are
 * mocked so these tests run entirely in-memory without a network or auth.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock these before any imports that transitively use them
vi.mock('~/utils/api', () => ({
  fetchDataApi: vi.fn(),
  fetchUserApi: vi.fn(),
  fetchImageApi: vi.fn(),
  fetchPdfApi: vi.fn(),
}));

vi.mock('~/utils/data/permissions', () => ({
  validateUserSession: vi.fn(),
  canAccessCase: vi.fn(),
  canModifyCase: vi.fn(),
  canCreateCase: vi.fn(),
}));

// Firebase auth: mock so User type resolves without a real Firebase project
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}));

import { fetchDataApi } from '~/utils/api';
import { validateUserSession, canAccessCase } from '~/utils/data/permissions';
import {
  upsertFileConfirmationSummary,
  removeFileConfirmationSummary,
  removeCaseConfirmationSummary,
  moveCaseConfirmationSummary,
  getCaseConfirmationSummary,
} from '~/utils/data/operations/confirmation-summary-operations';
import type {
  UserConfirmationSummaryDocument,
  CaseConfirmationSummary,
} from '~/utils/data/confirmation-summary/summary-core';
import type { AnnotationData } from '~/types';
import type { User } from 'firebase/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetchDataApi = fetchDataApi as MockedFunction<typeof fetchDataApi>;
const mockValidateUserSession = validateUserSession as MockedFunction<typeof validateUserSession>;
const mockCanAccessCase = canAccessCase as MockedFunction<typeof canAccessCase>;

/** Minimal mock User object */
const mockUser = { uid: 'test-uid-001' } as User;

/** Build a minimal AnnotationData with optional confirmation count */
function makeAnnotationData(confirmedCount = 0): AnnotationData {
  return {
    leftItemType: 'bullet',
    rightItemType: 'bullet',
    updatedAt: new Date().toISOString(),
    earliestAnnotationTimestamp: new Date().toISOString(),
    includeConfirmation: confirmedCount > 0,
    confirmationData: confirmedCount > 0
      ? [
          {
            fullName: 'Test Officer',
            badgeId: 'B001',
            timestamp: new Date().toISOString(),
            confirmationId: 'conf-001',
            confirmedBy: 'uid-001',
            confirmedByEmail: 'officer@example.com',
            confirmedByCompany: 'Crime Lab',
            confirmedAt: new Date().toISOString(),
          },
        ]
      : [],
  } as unknown as AnnotationData;
}

/** Build a summary document with a given set of cases */
function makeSummaryDocument(
  cases: Record<string, CaseConfirmationSummary>
): UserConfirmationSummaryDocument {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    cases,
  };
}

/** Helper: set up fetchDataApi to return a given summary on GET and accept PUT */
function setupSummaryMocks(summary: UserConfirmationSummaryDocument) {
  let storedSummary = structuredClone(summary);

  mockFetchDataApi.mockImplementation(async (_user, _path, init) => {
    if (!init || init.method === 'GET') {
      return new Response(JSON.stringify(storedSummary), { status: 200 });
    }
    if (init.method === 'PUT') {
      storedSummary = JSON.parse(init.body as string) as UserConfirmationSummaryDocument;
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 405 });
  });

  return { getStored: () => storedSummary };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockValidateUserSession.mockResolvedValue({ valid: true } as ReturnType<typeof validateUserSession> extends Promise<infer T> ? T : never);
  mockCanAccessCase.mockResolvedValue({ allowed: true } as ReturnType<typeof canAccessCase> extends Promise<infer T> ? T : never);
});

// ---------------------------------------------------------------------------
// upsertFileConfirmationSummary
// ---------------------------------------------------------------------------

describe('upsertFileConfirmationSummary', () => {
  it('adds a new file entry to an empty case summary', async () => {
    const initial = makeSummaryDocument({});
    const { getStored } = setupSummaryMocks(initial);

    await upsertFileConfirmationSummary(mockUser, 'CASE-001', 'file-001', makeAnnotationData(0));

    const stored = getStored();
    expect(stored.cases['CASE-001']).toBeDefined();
    expect(stored.cases['CASE-001'].filesById['file-001']).toBeDefined();
  });

  it('updates an existing file entry without affecting other files', async () => {
    const initial = makeSummaryDocument({
      'CASE-001': {
        includeConfirmation: false,
        isConfirmed: false,
        updatedAt: new Date().toISOString(),
        filesById: {
          'file-001': { includeConfirmation: false, isConfirmed: false, updatedAt: new Date().toISOString() },
          'file-002': { includeConfirmation: false, isConfirmed: false, updatedAt: new Date().toISOString() },
        },
      },
    });
    const { getStored } = setupSummaryMocks(initial);

    await upsertFileConfirmationSummary(mockUser, 'CASE-001', 'file-001', makeAnnotationData(1));

    const stored = getStored();
    // file-001 should be updated to confirmed
    expect(stored.cases['CASE-001'].filesById['file-001'].isConfirmed).toBe(true);
    // file-002 should be untouched
    expect(stored.cases['CASE-001'].filesById['file-002'].isConfirmed).toBe(false);
  });

  it('sets isConfirmed=true when annotationData has confirmations', async () => {
    const initial = makeSummaryDocument({});
    const { getStored } = setupSummaryMocks(initial);

    await upsertFileConfirmationSummary(mockUser, 'CASE-001', 'file-001', makeAnnotationData(1));

    const stored = getStored();
    expect(stored.cases['CASE-001'].filesById['file-001'].isConfirmed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeFileConfirmationSummary
// ---------------------------------------------------------------------------

describe('removeFileConfirmationSummary', () => {
  it('removes only the targeted file, leaving others intact', async () => {
    const initial = makeSummaryDocument({
      'CASE-001': {
        includeConfirmation: true,
        isConfirmed: true,
        updatedAt: new Date().toISOString(),
        filesById: {
          'file-001': { includeConfirmation: true, isConfirmed: true, updatedAt: new Date().toISOString() },
          'file-002': { includeConfirmation: false, isConfirmed: false, updatedAt: new Date().toISOString() },
        },
      },
    });
    const { getStored } = setupSummaryMocks(initial);

    await removeFileConfirmationSummary(mockUser, 'CASE-001', 'file-001');

    const stored = getStored();
    expect(stored.cases['CASE-001'].filesById['file-001']).toBeUndefined();
    expect(stored.cases['CASE-001'].filesById['file-002']).toBeDefined();
  });

  it('is a no-op when the file does not exist in the summary', async () => {
    const initial = makeSummaryDocument({
      'CASE-001': {
        includeConfirmation: false,
        isConfirmed: false,
        updatedAt: new Date().toISOString(),
        filesById: {},
      },
    });
    setupSummaryMocks(initial);

    // Should not throw and should not call PUT
    await expect(
      removeFileConfirmationSummary(mockUser, 'CASE-001', 'nonexistent-file')
    ).resolves.not.toThrow();

    // PUT should not have been called (no change)
    const putCalls = mockFetchDataApi.mock.calls.filter((c) => c[2]?.method === 'PUT');
    expect(putCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// removeCaseConfirmationSummary (orphan prevention on delete)
// ---------------------------------------------------------------------------

describe('removeCaseConfirmationSummary', () => {
  it('removes the entire case entry from the summary document', async () => {
    const initial = makeSummaryDocument({
      'CASE-001': {
        includeConfirmation: true,
        isConfirmed: true,
        updatedAt: new Date().toISOString(),
        filesById: {
          'file-001': { includeConfirmation: true, isConfirmed: true, updatedAt: new Date().toISOString() },
        },
      },
      'CASE-002': {
        includeConfirmation: false,
        isConfirmed: false,
        updatedAt: new Date().toISOString(),
        filesById: {},
      },
    });
    const { getStored } = setupSummaryMocks(initial);

    await removeCaseConfirmationSummary(mockUser, 'CASE-001');

    const stored = getStored();
    // CASE-001 must be gone (no orphan)
    expect(stored.cases['CASE-001']).toBeUndefined();
    // CASE-002 must be untouched
    expect(stored.cases['CASE-002']).toBeDefined();
  });

  it('persists the deletion to the data store (calls PUT)', async () => {
    const initial = makeSummaryDocument({
      'CASE-001': {
        includeConfirmation: true,
        isConfirmed: true,
        updatedAt: new Date().toISOString(),
        filesById: {},
      },
    });
    setupSummaryMocks(initial);

    await removeCaseConfirmationSummary(mockUser, 'CASE-001');

    const putCalls = mockFetchDataApi.mock.calls.filter((c) => c[2]?.method === 'PUT');
    expect(putCalls.length).toBe(1);
  });

  it('is a no-op when the case does not exist', async () => {
    const initial = makeSummaryDocument({});
    setupSummaryMocks(initial);

    await expect(
      removeCaseConfirmationSummary(mockUser, 'NONEXISTENT-CASE')
    ).resolves.not.toThrow();

    const putCalls = mockFetchDataApi.mock.calls.filter((c) => c[2]?.method === 'PUT');
    expect(putCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// moveCaseConfirmationSummary (orphan prevention on rename)
// ---------------------------------------------------------------------------

describe('moveCaseConfirmationSummary', () => {
  it('moves summary data to the new case key', async () => {
    const initial = makeSummaryDocument({
      'OLD-CASE': {
        includeConfirmation: true,
        isConfirmed: true,
        updatedAt: new Date().toISOString(),
        filesById: {
          'file-001': { includeConfirmation: true, isConfirmed: true, updatedAt: new Date().toISOString() },
        },
      },
    });
    const { getStored } = setupSummaryMocks(initial);

    await moveCaseConfirmationSummary(mockUser, 'OLD-CASE', 'NEW-CASE');

    const stored = getStored();
    expect(stored.cases['NEW-CASE']).toBeDefined();
    expect(stored.cases['NEW-CASE'].filesById['file-001']).toBeDefined();
  });

  it('removes the old case key after moving (no orphan)', async () => {
    const initial = makeSummaryDocument({
      'OLD-CASE': {
        includeConfirmation: true,
        isConfirmed: true,
        updatedAt: new Date().toISOString(),
        filesById: {},
      },
    });
    const { getStored } = setupSummaryMocks(initial);

    await moveCaseConfirmationSummary(mockUser, 'OLD-CASE', 'NEW-CASE');

    const stored = getStored();
    // Old key must be gone — this is the orphan prevention assertion
    expect(stored.cases['OLD-CASE']).toBeUndefined();
  });

  it('is a no-op when fromCaseNumber and toCaseNumber are the same', async () => {
    const initial = makeSummaryDocument({
      'SAME-CASE': {
        includeConfirmation: false,
        isConfirmed: false,
        updatedAt: new Date().toISOString(),
        filesById: {},
      },
    });
    setupSummaryMocks(initial);

    await moveCaseConfirmationSummary(mockUser, 'SAME-CASE', 'SAME-CASE');

    const putCalls = mockFetchDataApi.mock.calls.filter((c) => c[2]?.method === 'PUT');
    expect(putCalls.length).toBe(0);
  });

  it('is a no-op when the source case does not exist', async () => {
    const initial = makeSummaryDocument({});
    setupSummaryMocks(initial);

    await moveCaseConfirmationSummary(mockUser, 'NONEXISTENT', 'NEW-CASE');

    const putCalls = mockFetchDataApi.mock.calls.filter((c) => c[2]?.method === 'PUT');
    expect(putCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCaseConfirmationSummary
// ---------------------------------------------------------------------------

describe('getCaseConfirmationSummary', () => {
  it('returns the summary for an existing case', async () => {
    const caseSummary: CaseConfirmationSummary = {
      includeConfirmation: true,
      isConfirmed: false,
      updatedAt: new Date().toISOString(),
      filesById: {
        'file-a': {
          includeConfirmation: true,
          isConfirmed: false,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    const initial = makeSummaryDocument({ 'CASE-001': caseSummary });
    setupSummaryMocks(initial);

    const result = await getCaseConfirmationSummary(mockUser, 'CASE-001');
    expect(result).not.toBeNull();
    expect(result!.includeConfirmation).toBe(true);
  });

  it('returns null for a case that does not exist in the summary', async () => {
    const initial = makeSummaryDocument({});
    setupSummaryMocks(initial);

    const result = await getCaseConfirmationSummary(mockUser, 'NONEXISTENT');
    expect(result).toBeNull();
  });
});
