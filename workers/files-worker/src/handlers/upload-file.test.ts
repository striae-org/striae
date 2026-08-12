import { describe, expect, it } from 'vitest';

import { MAX_OTHER_FILE_SIZE_BYTES, validateUploadSize } from './upload-file';

describe('upload-file limits', () => {
  it('caps uploads at a worker-safe limit', () => {
    expect(MAX_OTHER_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
    expect(() => validateUploadSize(MAX_OTHER_FILE_SIZE_BYTES + 1)).toThrow(
      'File size exceeds 100 MB limit'
    );
    expect(validateUploadSize(MAX_OTHER_FILE_SIZE_BYTES)).toBeUndefined();
  });
});
