import { Configuration } from './Configuration';
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
});
