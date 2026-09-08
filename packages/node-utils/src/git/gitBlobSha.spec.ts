import { gitBlobSha } from './gitBlobSha';

/**
 * The expectations are not self-referential: every hash below was produced by
 * git itself, via `printf '<content>' | git hash-object --stdin`. A test that
 * only checked our own output against our own formula would pass just as
 * happily with the header spelled wrong.
 */
describe('gitBlobSha', () => {
  it('hashes an empty file to the well-known empty blob', () => {
    expect(gitBlobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  });

  it('hashes a single-line file the way git does', () => {
    expect(gitBlobSha('hello\n')).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    );
  });

  it('hashes a multi-line file the way git does', () => {
    expect(gitBlobSha('line one\nline two\n')).toBe(
      'e5c5c5583f49a34e86ce622b59363df99e09d4c6',
    );
  });

  describe('when the content holds multi-byte characters', () => {
    // 'café ✓\n' is 7 characters but 10 bytes, so a header counting characters
    // would produce a hash git never yields.
    it('counts bytes rather than characters in the header', () => {
      expect(gitBlobSha('café ✓\n')).toBe(
        '6b2b281e1146f9673f218f9c76042db37be95d03',
      );
    });
  });

  describe('when two contents differ only by their line endings', () => {
    it('gives the CRLF copy the hash git gives it', () => {
      expect(gitBlobSha('line one\r\nline two\r\n')).toBe(
        'cf9b2a85b62bc2fd67c5ed43a1d0009df848ac8a',
      );
    });

    it('hashes them differently, applying no normalisation', () => {
      expect(gitBlobSha('line one\r\nline two\r\n')).not.toBe(
        gitBlobSha('line one\nline two\n'),
      );
    });
  });

  it('gives identical content the same hash on every call', () => {
    expect(gitBlobSha('stable\n')).toBe(gitBlobSha('stable\n'));
  });
});
