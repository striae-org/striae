import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/user-worker/src/types';

vi.mock('../../../workers/user-worker/src/cleanup/case-data-reader', () => ({
	getDataAtRestPrivateKeyRegistry: vi.fn(),
	readCaseFileIds: vi.fn()
}));

import {
	getDataAtRestPrivateKeyRegistry,
	readCaseFileIds
} from '../../../workers/user-worker/src/cleanup/case-data-reader';
import { sweepOrphanedFiles } from '../../../workers/user-worker/src/cleanup/orphan-sweep';

const REGISTRY = { activeKeyId: 'k1', keys: { k1: 'pem' } };
const OLD_UPLOAD = new Date(Date.now() - 48 * 60 * 60 * 1000);
const RECENT_UPLOAD = new Date(Date.now() - 60 * 1000);

interface DataPage {
	objects: { key: string }[];
	truncated: boolean;
	cursor?: string;
}

interface FilesPage {
	objects: { key: string; uploaded?: Date }[];
	truncated: boolean;
	cursor?: string;
}

function pagedList<T extends { truncated: boolean }>(pages: T[]) {
	let call = 0;
	return vi.fn(async () => {
		const page = pages[Math.min(call, pages.length - 1)];
		call += 1;
		return page;
	});
}

function createEnv(options: {
	dataPages?: DataPage[];
	filesPages?: FilesPage[];
	deleteImpl?: (key: string) => Promise<void>;
} = {}): Env {
	const {
		dataPages = [{ objects: [], truncated: false }],
		filesPages = [{ objects: [], truncated: false }],
		deleteImpl = async () => undefined
	} = options;

	return {
		STRIAE_DATA: { list: pagedList(dataPages) } as unknown,
		STRIAE_FILES: { list: pagedList(filesPages), delete: vi.fn(deleteImpl) } as unknown
	} as Env;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue(REGISTRY as never);
	vi.mocked(readCaseFileIds).mockResolvedValue([]);
});

describe('sweepOrphanedFiles', () => {
	it('deletes files not referenced by any case-data record after the grace period', async () => {
		const env = createEnv({
			filesPages: [{ objects: [{ key: 'orphan.jpg', uploaded: OLD_UPLOAD }], truncated: false }]
		});

		const result = await sweepOrphanedFiles(env);

		expect(result.orphanCandidates).toBe(1);
		expect(result.deleted).toBe(1);
		expect(env.STRIAE_FILES.delete).toHaveBeenCalledWith('orphan.jpg');
	});

	it('skips files referenced by a case-data record', async () => {
		vi.mocked(readCaseFileIds).mockResolvedValue(['referenced.jpg']);
		const env = createEnv({
			dataPages: [{ objects: [{ key: 'u1/CASE-1/data.json' }], truncated: false }],
			filesPages: [{ objects: [{ key: 'referenced.jpg', uploaded: OLD_UPLOAD }], truncated: false }]
		});

		const result = await sweepOrphanedFiles(env);

		expect(result.referencedFileIds).toBe(1);
		expect(result.orphanCandidates).toBe(0);
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
	});

	it('skips files uploaded within the grace period', async () => {
		const env = createEnv({
			filesPages: [{ objects: [{ key: 'fresh.jpg', uploaded: RECENT_UPLOAD }], truncated: false }]
		});

		const result = await sweepOrphanedFiles(env);

		expect(result.orphanCandidates).toBe(0);
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
	});

	it('counts candidates but deletes nothing in dry-run mode', async () => {
		const env = createEnv({
			filesPages: [{ objects: [{ key: 'orphan.jpg', uploaded: OLD_UPLOAD }], truncated: false }]
		});

		const result = await sweepOrphanedFiles(env, { dryRun: true });

		expect(result.orphanCandidates).toBe(1);
		expect(result.deleted).toBe(0);
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
	});

	it('stops scanning files once maxFileObjectsPerRun is reached and marks truncated', async () => {
		const env = createEnv({
			filesPages: [
				{ objects: [{ key: 'a.jpg', uploaded: OLD_UPLOAD }], truncated: true, cursor: 'c1' },
				{ objects: [{ key: 'b.jpg', uploaded: OLD_UPLOAD }], truncated: false }
			]
		});

		const result = await sweepOrphanedFiles(env, { maxFileObjectsPerRun: 1 });

		expect(result.scannedFileObjects).toBe(1);
		expect(result.truncated).toBe(true);
		expect(env.STRIAE_FILES.delete).toHaveBeenCalledTimes(1);
		expect(env.STRIAE_FILES.delete).toHaveBeenCalledWith('a.jpg');
	});

	it('stops scanning data keys once maxDataKeysPerRun is reached, marks dataScanTruncated, and skips deletions', async () => {
		const env = createEnv({
			dataPages: [
				{ objects: [{ key: 'u1/CASE-1/data.json' }], truncated: true, cursor: 'c1' },
				{ objects: [{ key: 'u1/CASE-2/data.json' }], truncated: false }
			],
			filesPages: [{ objects: [{ key: 'orphan.jpg', uploaded: OLD_UPLOAD }], truncated: false }]
		});

		const result = await sweepOrphanedFiles(env, { maxDataKeysPerRun: 1 });

		expect(result.dataScanTruncated).toBe(true);
		expect(result.scannedDataKeys).toBe(1);
		// Second page's case-data key must never be read once the cap is hit.
		expect(readCaseFileIds).toHaveBeenCalledTimes(1);
		expect(readCaseFileIds).toHaveBeenCalledWith(env, 'u1/CASE-1/data.json', REGISTRY);
		// A truncated reference scan can't prove orphan.jpg is unreferenced, so deletion is skipped.
		expect(result.orphanCandidates).toBe(1);
		expect(result.deleted).toBe(0);
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
	});

	it('fetches the key registry once and reuses it across all case-data records', async () => {
		const env = createEnv({
			dataPages: [
				{
					objects: [
						{ key: 'u1/CASE-1/data.json' },
						{ key: 'u1/CASE-2/data.json' },
						{ key: 'u1/CASE-3/data.json' }
					],
					truncated: false
				}
			]
		});

		await sweepOrphanedFiles(env);

		expect(getDataAtRestPrivateKeyRegistry).toHaveBeenCalledTimes(1);
		expect(readCaseFileIds).toHaveBeenCalledTimes(3);
		for (const call of vi.mocked(readCaseFileIds).mock.calls) {
			expect(call[2]).toBe(REGISTRY);
		}
	});

	it('aborts the sweep and deletes nothing when readCaseFileIds rejects (fail-closed envelope violation)', async () => {
		vi.mocked(readCaseFileIds).mockRejectedValueOnce(new Error('missing data-at-rest envelope'));
		const env = createEnv({
			dataPages: [{ objects: [{ key: 'u1/CASE-1/data.json' }], truncated: false }],
			filesPages: [{ objects: [{ key: 'orphan.jpg', uploaded: OLD_UPLOAD }], truncated: false }]
		});

		await expect(sweepOrphanedFiles(env)).rejects.toThrow('missing data-at-rest envelope');
		expect(env.STRIAE_FILES.list).not.toHaveBeenCalled();
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
	});

	it('records deletion errors without aborting the sweep', async () => {
		const env = createEnv({
			filesPages: [
				{
					objects: [
						{ key: 'fails.jpg', uploaded: OLD_UPLOAD },
						{ key: 'succeeds.jpg', uploaded: OLD_UPLOAD }
					],
					truncated: false
				}
			],
			deleteImpl: async (key: string) => {
				if (key === 'fails.jpg') {
					throw new Error('r2 delete failed');
				}
			}
		});

		const result = await sweepOrphanedFiles(env);

		expect(result.deleted).toBe(1);
		expect(result.deletionErrors).toHaveLength(1);
		expect(result.deletionErrors[0]).toContain('fails.jpg');
	});
});
