import * as fs from 'fs';
import { FileVersionCacheProvider } from './FileVersionCacheProvider';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileVersionCacheProvider', () => {
  let provider: FileVersionCacheProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new FileVersionCacheProvider();
  });

  describe('read', () => {
    describe('when the cache file does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
      });

      it('returns null', () => {
        expect(provider.read()).toBeNull();
      });
    });

    describe('when the cache file is valid', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({
            latestVersion: '1.2.3',
            checkedAt: '2026-05-19T10:00:00.000Z',
          }),
        );
      });

      it('returns the parsed entry with checkedAt as a Date', () => {
        const entry = provider.read();

        expect(entry).toEqual({
          latestVersion: '1.2.3',
          checkedAt: new Date('2026-05-19T10:00:00.000Z'),
        });
      });
    });

    describe('when the cache file contains invalid JSON', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('not json');
      });

      it('returns null', () => {
        expect(provider.read()).toBeNull();
      });
    });

    describe('when the cache file is missing fields', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({ latestVersion: '1.2.3' }),
        );
      });

      it('returns null', () => {
        expect(provider.read()).toBeNull();
      });
    });

    describe('when checkedAt is not a parseable date', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({
            latestVersion: '1.2.3',
            checkedAt: 'not-a-date',
          }),
        );
      });

      it('returns null', () => {
        expect(provider.read()).toBeNull();
      });
    });

    describe('when latestVersion is not a valid semver', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({
            latestVersion: 'not-a-version',
            checkedAt: '2026-05-19T10:00:00.000Z',
          }),
        );
      });

      it('returns null', () => {
        expect(provider.read()).toBeNull();
      });
    });
  });

  describe('write', () => {
    describe('when the cache directory does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
      });

      it('creates the directory and writes the file', () => {
        provider.write({
          latestVersion: '1.2.3',
          checkedAt: new Date('2026-05-19T10:00:00.000Z'),
        });

        expect(mockFs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('.packmind'),
          { recursive: true, mode: 0o700 },
        );
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          expect.stringMatching(/version-check\.json\.\d+\.tmp$/),
          expect.any(String),
          { mode: 0o600 },
        );
      });

      it('renames the temp file onto the final cache path', () => {
        provider.write({
          latestVersion: '1.2.3',
          checkedAt: new Date('2026-05-19T10:00:00.000Z'),
        });

        const [tmpPath, finalPath] = mockFs.renameSync.mock.calls[0];
        expect(tmpPath).toMatch(/version-check\.json\.\d+\.tmp$/);
        expect(finalPath).toMatch(/version-check\.json$/);
      });

      it('serializes checkedAt as an ISO string', () => {
        provider.write({
          latestVersion: '1.2.3',
          checkedAt: new Date('2026-05-19T10:00:00.000Z'),
        });

        const [, content] = mockFs.writeFileSync.mock.calls[0];
        const parsed = JSON.parse(content as string);
        expect(parsed).toEqual({
          latestVersion: '1.2.3',
          checkedAt: '2026-05-19T10:00:00.000Z',
        });
      });
    });

    describe('when write throws', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('disk full');
        });
      });

      it('does not throw', () => {
        expect(() =>
          provider.write({
            latestVersion: '1.2.3',
            checkedAt: new Date(),
          }),
        ).not.toThrow();
      });
    });
  });
});
