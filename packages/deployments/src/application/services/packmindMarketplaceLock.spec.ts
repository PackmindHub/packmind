import {
  GitRepo,
  IGitPort,
  createGitProviderId,
  createGitRepoId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  emptyPackmindMarketplaceLock,
  fetchPackmindMarketplaceLock,
  PACKMIND_MARKETPLACE_LOCK_PATH,
  parsePackmindMarketplaceLock,
  serializePackmindMarketplaceLock,
} from './packmindMarketplaceLock';

describe('packmindMarketplaceLock', () => {
  const gitRepo: GitRepo = {
    id: createGitRepoId(uuidv4()),
    owner: 'acme',
    repo: 'marketplace',
    branch: 'main',
    providerId: createGitProviderId(uuidv4()),
    type: 'marketplace',
  };
  const userId = createUserId(uuidv4());

  afterEach(() => jest.clearAllMocks());

  describe('emptyPackmindMarketplaceLock', () => {
    it('returns a lock with schemaVersion 1 and no plugins', () => {
      expect(emptyPackmindMarketplaceLock()).toEqual({
        schemaVersion: 1,
        plugins: {},
      });
    });
  });

  describe('serializePackmindMarketplaceLock', () => {
    it('produces pretty-printed JSON with two-space indent', () => {
      const lock = {
        schemaVersion: 1 as const,
        plugins: {
          security: {
            version: '0.1.0',
            contentHash: 'hash-1',
            lastPublishedAt: '2026-06-01T10:00:00.000Z',
            lastPublishedBy: userId,
          },
        },
      };
      expect(serializePackmindMarketplaceLock(lock)).toBe(
        JSON.stringify(lock, null, 2),
      );
    });
  });

  describe('parsePackmindMarketplaceLock', () => {
    describe('when the content is a valid v1 lock', () => {
      it('returns the parsed lock with all plugin entries', () => {
        const content = JSON.stringify({
          schemaVersion: 1,
          plugins: {
            security: {
              version: '0.1.0',
              contentHash: 'hash-1',
              lastPublishedAt: '2026-06-01T10:00:00.000Z',
              lastPublishedBy: userId,
            },
          },
        });
        expect(parsePackmindMarketplaceLock(content)).toEqual({
          schemaVersion: 1,
          plugins: {
            security: {
              version: '0.1.0',
              contentHash: 'hash-1',
              lastPublishedAt: '2026-06-01T10:00:00.000Z',
              lastPublishedBy: userId,
            },
          },
        });
      });
    });

    describe('when the content is not valid JSON', () => {
      it('throws a descriptive error', () => {
        expect(() => parsePackmindMarketplaceLock('not-json')).toThrow(
          /packmind-lock\.json is not valid JSON/,
        );
      });
    });

    describe('when the top-level value is not an object', () => {
      it('throws a descriptive error', () => {
        expect(() => parsePackmindMarketplaceLock('[]')).toThrow(
          /packmind-lock\.json must be a JSON object/,
        );
      });
    });

    describe('when schemaVersion is not 1', () => {
      it('throws a descriptive error', () => {
        const content = JSON.stringify({ schemaVersion: 2, plugins: {} });
        expect(() => parsePackmindMarketplaceLock(content)).toThrow(
          /unsupported schemaVersion/,
        );
      });
    });

    describe('when plugins is missing or malformed', () => {
      describe('when plugins is absent', () => {
        it('throws', () => {
          const content = JSON.stringify({ schemaVersion: 1 });
          expect(() => parsePackmindMarketplaceLock(content)).toThrow(
            /must have a "plugins" object/,
          );
        });
      });
    });

    describe('when a plugin entry is missing a required field', () => {
      it('throws a descriptive error mentioning the slug', () => {
        const content = JSON.stringify({
          schemaVersion: 1,
          plugins: { security: { contentHash: 'h' } },
        });
        expect(() => parsePackmindMarketplaceLock(content)).toThrow(
          /security.*version/,
        );
      });
    });
  });

  describe('fetchPackmindMarketplaceLock', () => {
    describe('when the file is missing', () => {
      it('returns an empty lock', async () => {
        const mockGitPort = {
          getFileFromRepo: jest.fn().mockResolvedValue(null),
        } as unknown as IGitPort;
        const lock = await fetchPackmindMarketplaceLock(
          mockGitPort,
          gitRepo,
          'main',
        );
        expect(lock).toEqual(emptyPackmindMarketplaceLock());
      });
    });

    describe('when the file is present and valid', () => {
      it('returns the parsed lock', async () => {
        const content = JSON.stringify({
          schemaVersion: 1,
          plugins: {
            security: {
              version: '0.1.0',
              contentHash: 'hash-1',
              lastPublishedAt: '2026-06-01T10:00:00.000Z',
              lastPublishedBy: userId,
            },
          },
        });
        const mockGitPort = {
          getFileFromRepo: jest
            .fn()
            .mockResolvedValue({ sha: 'sha-1', content }),
        } as unknown as IGitPort;
        const lock = await fetchPackmindMarketplaceLock(
          mockGitPort,
          gitRepo,
          'main',
        );
        expect(lock.plugins['security']?.contentHash).toBe('hash-1');
      });
    });

    describe('when the file is present but unparseable', () => {
      it('rethrows the parse error', async () => {
        const mockGitPort = {
          getFileFromRepo: jest
            .fn()
            .mockResolvedValue({ sha: 'sha-1', content: 'not-json' }),
        } as unknown as IGitPort;
        await expect(
          fetchPackmindMarketplaceLock(mockGitPort, gitRepo, 'main'),
        ).rejects.toThrow(/packmind-lock\.json is not valid JSON/);
      });
    });

    describe('when the file has an unsupported schemaVersion', () => {
      it('rethrows the validation error', async () => {
        const content = JSON.stringify({ schemaVersion: 99, plugins: {} });
        const mockGitPort = {
          getFileFromRepo: jest
            .fn()
            .mockResolvedValue({ sha: 'sha-1', content }),
        } as unknown as IGitPort;
        await expect(
          fetchPackmindMarketplaceLock(mockGitPort, gitRepo, 'main'),
        ).rejects.toThrow(/unsupported schemaVersion/);
      });
    });

    describe('PACKMIND_MARKETPLACE_LOCK_PATH', () => {
      it('targets the marketplace repo root', () => {
        expect(PACKMIND_MARKETPLACE_LOCK_PATH).toBe('packmind-lock.json');
      });
    });
  });
});
