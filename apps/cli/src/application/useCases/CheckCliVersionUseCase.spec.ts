import {
  CheckCliVersionUseCase,
  ICheckCliVersionDependencies,
} from './CheckCliVersionUseCase';
import {
  IVersionCacheEntry,
  IVersionCacheProvider,
} from '../../domain/repositories/IVersionCacheProvider';

describe('CheckCliVersionUseCase', () => {
  let mockFetchLatestVersion: jest.MockedFunction<
    ICheckCliVersionDependencies['fetchLatestVersion']
  >;
  let mockFetchFn: jest.MockedFunction<typeof fetch>;
  let cacheStore: IVersionCacheEntry | null;
  let cacheProvider: IVersionCacheProvider;
  let now: Date;
  let useCase: CheckCliVersionUseCase;

  function createUseCase(
    overrides?: Partial<ICheckCliVersionDependencies>,
  ): CheckCliVersionUseCase {
    return new CheckCliVersionUseCase({
      fetchLatestVersion: mockFetchLatestVersion,
      fetchFn: mockFetchFn,
      timeoutMs: 1000,
      cacheProvider,
      cacheTtlMs: 24 * 60 * 60 * 1000,
      now: () => now,
      ...overrides,
    });
  }

  beforeEach(() => {
    mockFetchLatestVersion = jest.fn();
    mockFetchFn = jest.fn();
    cacheStore = null;
    cacheProvider = {
      read: jest.fn(() => cacheStore),
      write: jest.fn((entry: IVersionCacheEntry) => {
        cacheStore = entry;
      }),
    };
    now = new Date('2026-05-19T10:00:00.000Z');
    useCase = createUseCase();
  });

  describe('when cache is empty', () => {
    describe('when latest version is newer', () => {
      beforeEach(() => {
        mockFetchLatestVersion.mockResolvedValue('1.2.0');
      });

      it('fetches and returns updateAvailable as true', async () => {
        const result = await useCase.execute({ currentVersion: '1.0.0' });

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: '1.2.0',
          updateAvailable: true,
        });
      });

      it('writes the fetched version to cache', async () => {
        await useCase.execute({ currentVersion: '1.0.0' });

        expect(cacheProvider.write).toHaveBeenCalledWith({
          latestVersion: '1.2.0',
          checkedAt: now,
        });
      });
    });

    describe('when current version matches latest', () => {
      beforeEach(() => {
        mockFetchLatestVersion.mockResolvedValue('1.0.0');
      });

      it('returns updateAvailable as false', async () => {
        const result = await useCase.execute({ currentVersion: '1.0.0' });

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: '1.0.0',
          updateAvailable: false,
        });
      });
    });

    describe('when current version is newer', () => {
      beforeEach(() => {
        mockFetchLatestVersion.mockResolvedValue('1.0.0');
      });

      it('returns updateAvailable as false', async () => {
        const result = await useCase.execute({ currentVersion: '2.0.0' });

        expect(result).toEqual({
          currentVersion: '2.0.0',
          latestVersion: '1.0.0',
          updateAvailable: false,
        });
      });
    });

    describe('when fetch fails', () => {
      beforeEach(() => {
        mockFetchLatestVersion.mockRejectedValue(new Error('Network error'));
      });

      it('returns null', async () => {
        const result = await useCase.execute({ currentVersion: '1.0.0' });

        expect(result).toBeNull();
      });

      it('does not write to cache', async () => {
        await useCase.execute({ currentVersion: '1.0.0' });

        expect(cacheProvider.write).not.toHaveBeenCalled();
      });
    });

    describe('when fetch times out', () => {
      beforeEach(() => {
        mockFetchLatestVersion.mockImplementation(
          () =>
            new Promise<string>(() => {
              // intentionally never resolves to simulate timeout
            }),
        );
        useCase = createUseCase({ timeoutMs: 50 });
      });

      it('returns null', async () => {
        const result = await useCase.execute({ currentVersion: '1.0.0' });

        expect(result).toBeNull();
      });
    });

    it('passes fetchFn to fetchLatestVersion', async () => {
      mockFetchLatestVersion.mockResolvedValue('1.0.0');

      await useCase.execute({ currentVersion: '1.0.0' });

      expect(mockFetchLatestVersion).toHaveBeenCalledWith(mockFetchFn);
    });
  });

  describe('when cache is fresh', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date('2026-05-19T08:00:00.000Z'),
      };
    });

    it('returns the cached version without fetching', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.5.0',
        updateAvailable: true,
      });
      expect(mockFetchLatestVersion).not.toHaveBeenCalled();
    });

    it('does not rewrite the cache', async () => {
      await useCase.execute({ currentVersion: '1.0.0' });

      expect(cacheProvider.write).not.toHaveBeenCalled();
    });
  });

  describe('when cache is stale', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date('2026-05-18T08:00:00.000Z'),
      };
      mockFetchLatestVersion.mockResolvedValue('1.6.0');
    });

    it('fetches a fresh version', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.6.0',
        updateAvailable: true,
      });
      expect(mockFetchLatestVersion).toHaveBeenCalledTimes(1);
    });

    it('updates the cache with the new version', async () => {
      await useCase.execute({ currentVersion: '1.0.0' });

      expect(cacheProvider.write).toHaveBeenCalledWith({
        latestVersion: '1.6.0',
        checkedAt: now,
      });
    });
  });

  describe('when cache timestamp is in the future', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date('2026-05-20T10:00:00.000Z'),
      };
      mockFetchLatestVersion.mockResolvedValue('1.6.0');
    });

    it('ignores the cache and fetches fresh', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result?.latestVersion).toBe('1.6.0');
      expect(mockFetchLatestVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('when cache is stale and fetch fails', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date('2026-05-18T08:00:00.000Z'),
      };
      mockFetchLatestVersion.mockRejectedValue(new Error('Network error'));
    });

    it('returns null', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toBeNull();
    });

    it('does not overwrite the stale cache on failure', async () => {
      await useCase.execute({ currentVersion: '1.0.0' });

      expect(cacheProvider.write).not.toHaveBeenCalled();
    });
  });

  describe('when cache is exactly at TTL boundary', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      };
      mockFetchLatestVersion.mockResolvedValue('1.6.0');
    });

    it('treats the cache as stale and refetches', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result?.latestVersion).toBe('1.6.0');
      expect(mockFetchLatestVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('when cache is one millisecond inside TTL', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date(now.getTime() - (24 * 60 * 60 * 1000 - 1)),
      };
    });

    it('uses the cached value', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result?.latestVersion).toBe('1.5.0');
      expect(mockFetchLatestVersion).not.toHaveBeenCalled();
    });
  });

  describe('when current version has caught up to the cached version', () => {
    beforeEach(() => {
      cacheStore = {
        latestVersion: '1.5.0',
        checkedAt: new Date('2026-05-19T08:00:00.000Z'),
      };
      mockFetchLatestVersion.mockResolvedValue('1.6.0');
    });

    it('refetches when current equals cached', async () => {
      const result = await useCase.execute({ currentVersion: '1.5.0' });

      expect(result?.latestVersion).toBe('1.6.0');
      expect(mockFetchLatestVersion).toHaveBeenCalledTimes(1);
    });

    it('refetches when current is newer than cached', async () => {
      const result = await useCase.execute({ currentVersion: '1.6.0' });

      expect(mockFetchLatestVersion).toHaveBeenCalledTimes(1);
      expect(result?.updateAvailable).toBe(false);
    });
  });
});
