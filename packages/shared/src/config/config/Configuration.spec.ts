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
      it('returns null', async () => {
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
        // INFISICAL_CLIENT_ID is intentionally missing

        const result = await Configuration.getConfig('TEST_KEY');

        expect(result).toBeNull();
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when INFISICAL_CLIENT_SECRET is missing', () => {
      it('returns null', async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
        // INFISICAL_CLIENT_SECRET is intentionally missing

        const result = await Configuration.getConfig('TEST_KEY');

        expect(result).toBeNull();
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when INFISICAL_ENV is missing', () => {
      it('returns null', async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project';
        // INFISICAL_ENV is intentionally missing

        const result = await Configuration.getConfig('TEST_KEY');

        expect(result).toBeNull();
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when INFISICAL_PROJECT_ID is missing', () => {
      it('returns null', async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        // INFISICAL_PROJECT_ID is intentionally missing

        const result = await Configuration.getConfig('TEST_KEY');

        expect(result).toBeNull();
        expect(MockedInfisicalConfig).not.toHaveBeenCalled();
      });
    });

    describe('when all required env vars are set', () => {
      it('instantiates InfisicalConfig', async () => {
        process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
        process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
        process.env['INFISICAL_ENV'] = 'test-env';
        process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

        await Configuration.getConfig('TEST_KEY');

        expect(MockedInfisicalConfig).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret',
          'test-env',
          'test-project-id',
        );
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
    it('only initializes once even with multiple sequential calls', async () => {
      process.env['CONFIGURATION'] = 'infisical';
      process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
      process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
      process.env['INFISICAL_ENV'] = 'test-env';
      process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

      const mockInitClient = jest.fn();
      const mockGetValue = jest.fn().mockResolvedValue('test-value');
      MockedInfisicalConfig.mockImplementation(() => {
        return {
          initClient: mockInitClient,
          getValue: mockGetValue,
        } as Partial<InfisicalConfig> as InfisicalConfig;
      });

      await Configuration.getConfig('TEST_KEY_1');
      await Configuration.getConfig('TEST_KEY_2');

      expect(MockedInfisicalConfig).toHaveBeenCalledTimes(1);
      expect(mockInitClient).toHaveBeenCalledTimes(1);
    });

    it('only initializes once even with multiple concurrent calls', async () => {
      process.env['CONFIGURATION'] = 'infisical';
      process.env['INFISICAL_CLIENT_ID'] = 'test-client-id';
      process.env['INFISICAL_CLIENT_SECRET'] = 'test-client-secret';
      process.env['INFISICAL_ENV'] = 'test-env';
      process.env['INFISICAL_PROJECT_ID'] = 'test-project-id';

      const mockInitClient = jest.fn().mockResolvedValue(undefined);
      const mockGetValue = jest.fn().mockResolvedValue('test-value');
      MockedInfisicalConfig.mockImplementation(() => {
        return {
          initClient: mockInitClient,
          getValue: mockGetValue,
        } as Partial<InfisicalConfig> as InfisicalConfig;
      });

      // Simulate multiple concurrent calls to Configuration.getConfig
      const promises = [
        Configuration.getConfig('TEST_KEY_1'),
        Configuration.getConfig('TEST_KEY_2'),
        Configuration.getConfig('TEST_KEY_3'),
      ];

      await Promise.all(promises);

      expect(MockedInfisicalConfig).toHaveBeenCalledTimes(1);
      expect(mockInitClient).toHaveBeenCalledTimes(1);
    });
  });
});
