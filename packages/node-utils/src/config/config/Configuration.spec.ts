import {
  Configuration,
  CONFIG_SOFT_TTL_MS,
  CONFIG_HARD_TTL_MS,
} from './Configuration';
import { InfisicalConfig } from '../infra/Infisical/InfisicalConfig';

jest.mock('../infra/Infisical/InfisicalConfig');

const MockedInfisicalConfig = InfisicalConfig as jest.MockedClass<
  typeof InfisicalConfig
>;

describe('Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original env and reset Configuration singleton
    originalEnv = { ...process.env };
    // Reset the singleton instance
    (
      Configuration as unknown as { instance: Configuration | undefined }
    ).instance = undefined;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('when CONFIGURATION is not set to infisical', () => {
    it('does not instantiate InfisicalConfig', async () => {
      process.env['CONFIGURATION'] = 'local';

      await Configuration.getConfig('TEST_KEY');

      expect(MockedInfisicalConfig).not.toHaveBeenCalled();
    });

    describe('when CONFIGURATION is undefined', () => {
      it('does not instantiate InfisicalConfig', async () => {
        delete process.env['CONFIGURATION'];

        await Configuration.getConfig('TEST_KEY');

        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });
  });

  describe('when CONFIGURATION is set to infisical', () => {
    let mockInitClient: jest.Mock;
    let mockGetValue: jest.Mock;

    beforeEach(() => {
      process.env['CONFIGURATION'] = 'infisical';

      mockInitClient = jest.fn();
      mockGetValue = jest.fn().mockResolvedValue('test-value');

      MockedInfisicalConfig.mockImplementation(() => {
        return {
          initClient: mockInitClient,
          getValue: mockGetValue,
        } as Partial<InfisicalConfig> as InfisicalConfig;
      });
    });

    describe('when INFISICAL_CLIENT_ID is missing', () => {
      beforeEach(() => {
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
      });

      describe('when key exists in process.env', () => {
        let result: string | null;

        beforeEach(async () => {
          process.env['TEST_KEY'] = 'fallback-value';
          result = await Configuration.getConfig('TEST_KEY');
        });

        it('returns the fallback value from process.env', () => {
          expect(result).toBe('fallback-value');
        });

        it('does not instantiate InfisicalConfig', () => {
          expect(MockedInfisicalConfig).not.toHaveBeenCalled();
        });
      });

      describe('when key does not exist in process.env', () => {
        let result: string | null;

        beforeEach(async () => {
          result = await Configuration.getConfig('MISSING_KEY');
        });

        it('returns null', () => {
          expect(result).toBeNull();
        });

        it('does not instantiate InfisicalConfig', () => {
          expect(MockedInfisicalConfig).not.toHaveBeenCalled();
        });
      });
    });

    describe('when INFISICAL_CLIENT_SECRET is missing', () => {
      let result: string | null;

      beforeEach(async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
        process.env['TEST_KEY'] = 'fallback-value';
        result = await Configuration.getConfig('TEST_KEY');
      });

      it('returns the fallback value from process.env', () => {
        expect(result).toBe('fallback-value');
      });

      it('does not instantiate InfisicalConfig', () => {
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when INFISICAL_ENV is missing', () => {
      let result: string | null;

      beforeEach(async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
        process.env['TEST_KEY'] = 'fallback-value';
        result = await Configuration.getConfig('TEST_KEY');
      });

      it('returns the fallback value from process.env', () => {
        expect(result).toBe('fallback-value');
      });

      it('does not instantiate InfisicalConfig', () => {
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when INFISICAL_PROJECT_ID is missing', () => {
      let result: string | null;

      beforeEach(async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['TEST_KEY'] = 'fallback-value';
        result = await Configuration.getConfig('TEST_KEY');
      });

      it('returns the fallback value from process.env', () => {
        expect(result).toBe('fallback-value');
      });

      it('does not instantiate InfisicalConfig', () => {
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when all required env vars are set', () => {
      beforeEach(async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        await Configuration.getConfig('TEST_KEY');
      });

      it('instantiates InfisicalConfig with correct parameters', () => {
        expect(MockedInfisicalConfig).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          'test-env',
          'test-project-id',
        );
      });

      it('calls initClient', () => {
        expect(mockInitClient).toHaveBeenCalled();
      });
    });

    it('handles case-insensitive CONFIGURATION values', async () => {
      process.env['CONFIGURATION'] = 'INFISICAL'; // uppercase
      process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
      process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
      process.env['INFISICAL_ENV'] = 'test-env';
      process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

      await Configuration.getConfig('TEST_KEY');

      expect(MockedInfisicalConfig).toHaveBeenCalled();
    });
  });

  describe('singleton behavior', () => {
    describe('when making multiple sequential calls', () => {
      let mockInitClient: jest.Mock;

      beforeEach(async () => {
        process.env['CONFIGURATION'] = 'infisical';
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        mockInitClient = jest.fn();
        const mockGetValue = jest.fn().mockResolvedValue('test-value');
        MockedInfisicalConfig.mockImplementation(() => {
          return {
            initClient: mockInitClient,
            getValue: mockGetValue,
          } as Partial<InfisicalConfig> as InfisicalConfig;
        });

        await Configuration.getConfig('TEST_KEY_1');
        await Configuration.getConfig('TEST_KEY_2');
      });

      it('instantiates InfisicalConfig only once', () => {
        expect(MockedInfisicalConfig).toHaveBeenCalledTimes(1);
      });

      it('calls initClient only once', () => {
        expect(mockInitClient).toHaveBeenCalledTimes(1);
      });
    });

    describe('when making multiple concurrent calls', () => {
      let mockInitClient: jest.Mock;

      beforeEach(async () => {
        process.env['CONFIGURATION'] = 'infisical';
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        mockInitClient = jest.fn().mockResolvedValue(undefined);
        const mockGetValue = jest.fn().mockResolvedValue('test-value');
        MockedInfisicalConfig.mockImplementation(() => {
          return {
            initClient: mockInitClient,
            getValue: mockGetValue,
          } as Partial<InfisicalConfig> as InfisicalConfig;
        });

        const promises = [
          Configuration.getConfig('TEST_KEY_1'),
          Configuration.getConfig('TEST_KEY_2'),
          Configuration.getConfig('TEST_KEY_3'),
        ];

        await Promise.all(promises);
      });

      it('instantiates InfisicalConfig only once', () => {
        expect(MockedInfisicalConfig).toHaveBeenCalledTimes(1);
      });

      it('calls initClient only once', () => {
        expect(mockInitClient).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('fallback behavior', () => {
    describe('when Infisical initialization fails', () => {
      let mockInitClient: jest.Mock;

      beforeEach(() => {
        process.env['CONFIGURATION'] = 'infisical';
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        mockInitClient = jest
          .fn()
          .mockRejectedValue(new Error('Infisical is down'));
        MockedInfisicalConfig.mockImplementation(() => {
          return {
            initClient: mockInitClient,
            getValue: jest.fn(),
          } as Partial<InfisicalConfig> as InfisicalConfig;
        });
      });

      describe('when key exists in process.env', () => {
        let result: string | null;

        beforeEach(async () => {
          process.env['TEST_KEY'] = 'fallback-value';
          result = await Configuration.getConfig('TEST_KEY');
        });

        it('returns the fallback value from process.env', () => {
          expect(result).toBe('fallback-value');
        });

        it('calls initClient', () => {
          expect(mockInitClient).toHaveBeenCalled();
        });
      });

      describe('when key does not exist in process.env', () => {
        it('returns null', async () => {
          const result = await Configuration.getConfig('MISSING_KEY');

          expect(result).toBeNull();
        });
      });
    });

    describe('when Infisical getValue fails at runtime', () => {
      let mockGetValue: jest.Mock;

      beforeEach(() => {
        process.env['CONFIGURATION'] = 'infisical';
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        const mockInitClient = jest.fn().mockResolvedValue(undefined);
        mockGetValue = jest.fn().mockRejectedValue(new Error('Network error'));
        MockedInfisicalConfig.mockImplementation(() => {
          return {
            initClient: mockInitClient,
            getValue: mockGetValue,
          } as Partial<InfisicalConfig> as InfisicalConfig;
        });
      });

      describe('when key does not exist in process.env', () => {
        let result: string | null;

        beforeEach(async () => {
          result = await Configuration.getConfig('TEST_KEY');
        });

        it('returns null', () => {
          expect(result).toBeNull();
        });

        it('calls getValue with the key', () => {
          expect(mockGetValue).toHaveBeenCalledWith('TEST_KEY');
        });
      });

      describe('when key exists in process.env', () => {
        it('returns the fallback value from process.env', async () => {
          process.env['TEST_KEY'] = 'env-fallback-value';

          const result = await Configuration.getConfig('TEST_KEY');

          expect(result).toBe('env-fallback-value');
        });
      });
    });
  });

  describe('caching of Infisical values', () => {
    let mockGetValue: jest.Mock;
    let nowSpy: jest.SpyInstance<number, []>;
    let currentTime: number;

    // The stale-while-revalidate refresh is deliberately not awaited by the
    // caller, so tests have to let the microtask queue drain to observe it.
    const flushBackgroundRefresh = () =>
      new Promise((resolve) => setImmediate(resolve));

    beforeEach(() => {
      process.env['CONFIGURATION'] = 'infisical';
      process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
      process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
      process.env['INFISICAL_ENV'] = 'test-env';
      process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';
      delete process.env['CACHED_KEY'];

      currentTime = 1_000_000;
      nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      mockGetValue = jest.fn().mockResolvedValue('first-value');
      MockedInfisicalConfig.mockImplementation(() => {
        return {
          initClient: jest.fn(),
          getValue: mockGetValue,
        } as Partial<InfisicalConfig> as InfisicalConfig;
      });
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    describe('when the same key is read twice inside the soft TTL', () => {
      it('reads from Infisical once', async () => {
        await Configuration.getConfig('CACHED_KEY');
        currentTime += CONFIG_SOFT_TTL_MS - 1;
        await Configuration.getConfig('CACHED_KEY');

        expect(mockGetValue).toHaveBeenCalledTimes(1);
      });
    });

    describe('when concurrent readers ask for a cold key', () => {
      it('reads from Infisical once', async () => {
        await Promise.all([
          Configuration.getConfig('CACHED_KEY'),
          Configuration.getConfig('CACHED_KEY'),
          Configuration.getConfig('CACHED_KEY'),
        ]);

        expect(mockGetValue).toHaveBeenCalledTimes(1);
      });
    });

    describe('when a key is missing from Infisical', () => {
      it('caches the miss rather than asking again', async () => {
        mockGetValue.mockResolvedValue(null);

        await Configuration.getConfig('CACHED_KEY');
        await Configuration.getConfig('CACHED_KEY');

        expect(mockGetValue).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the key is read past the soft TTL', () => {
      beforeEach(async () => {
        await Configuration.getConfig('CACHED_KEY');
        mockGetValue.mockResolvedValue('second-value');
        currentTime += CONFIG_SOFT_TTL_MS;
      });

      it('serves the stale value without waiting for the refresh', async () => {
        expect(await Configuration.getConfig('CACHED_KEY')).toBe('first-value');
      });

      it('refreshes behind the read, so the next read sees the new value', async () => {
        await Configuration.getConfig('CACHED_KEY');
        await flushBackgroundRefresh();

        expect(await Configuration.getConfig('CACHED_KEY')).toBe(
          'second-value',
        );
      });
    });

    describe('when the key is read past the hard TTL', () => {
      it('waits for the refresh and returns the fresh value', async () => {
        await Configuration.getConfig('CACHED_KEY');
        mockGetValue.mockResolvedValue('second-value');
        currentTime += CONFIG_HARD_TTL_MS;

        expect(await Configuration.getConfig('CACHED_KEY')).toBe(
          'second-value',
        );
      });
    });

    describe('when Infisical is unreachable', () => {
      describe('when a background refresh fails', () => {
        beforeEach(async () => {
          await Configuration.getConfig('CACHED_KEY');
          mockGetValue.mockRejectedValue(new Error('infisical unreachable'));
          currentTime += CONFIG_SOFT_TTL_MS;
        });

        it('keeps serving the stale value', async () => {
          await expect(Configuration.getConfig('CACHED_KEY')).resolves.toBe(
            'first-value',
          );
        });

        it('leaves the entry in place for the next reader', async () => {
          await Configuration.getConfig('CACHED_KEY');
          await flushBackgroundRefresh();

          expect(await Configuration.getConfig('CACHED_KEY')).toBe(
            'first-value',
          );
        });
      });

      describe('when a blocking refresh past the hard TTL fails', () => {
        it('serves the stale value rather than null', async () => {
          await Configuration.getConfig('CACHED_KEY');
          mockGetValue.mockRejectedValue(new Error('infisical unreachable'));
          currentTime += CONFIG_HARD_TTL_MS;

          expect(await Configuration.getConfig('CACHED_KEY')).toBe(
            'first-value',
          );
        });
      });

      describe('when there is no cached value to fall back on', () => {
        it('returns null, as an uncached read does today', async () => {
          mockGetValue.mockRejectedValue(new Error('infisical unreachable'));

          expect(await Configuration.getConfig('CACHED_KEY')).toBeNull();
        });
      });
    });

    describe('when the cache is reset', () => {
      it('reads from Infisical again', async () => {
        await Configuration.getConfig('CACHED_KEY');
        Configuration.resetCache();
        await Configuration.getConfig('CACHED_KEY');

        expect(mockGetValue).toHaveBeenCalledTimes(2);
      });
    });
  });
});
