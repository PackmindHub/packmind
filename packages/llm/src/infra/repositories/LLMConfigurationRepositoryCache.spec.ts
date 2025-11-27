import { PackmindLogger } from '@packmind/logger';
import { Cache, Configuration, EncryptionService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  LLMProvider,
  LLMServiceConfig,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { LLMConfigurationRepositoryCache } from './LLMConfigurationRepositoryCache';
import { StoredLLMConfiguration } from '../../domain/repositories/ILLMConfigurationRepository';

jest.mock('@packmind/node-utils', () => ({
  Cache: {
    getInstance: jest.fn(),
  },
  Configuration: {
    getConfig: jest.fn(),
  },
  EncryptionService: jest.fn(),
}));

describe('LLMConfigurationRepositoryCache', () => {
  let repository: LLMConfigurationRepositoryCache;
  let mockCache: jest.Mocked<Cache>;
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockGetConfig: jest.MockedFunction<typeof Configuration.getConfig>;

  const organizationId = createOrganizationId(uuidv4());

  beforeEach(() => {
    mockLogger = stubLogger();
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    mockEncryptionService = {
      encrypt: jest.fn((value: string) => `encrypted:${value}`),
      decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
    } as unknown as jest.Mocked<EncryptionService>;

    (EncryptionService as jest.Mock).mockImplementation(
      () => mockEncryptionService,
    );

    mockGetConfig = Configuration.getConfig as jest.MockedFunction<
      typeof Configuration.getConfig
    >;
    mockGetConfig.mockResolvedValue('test-encryption-key');

    (Cache.getInstance as jest.Mock).mockReturnValue(mockCache);

    repository = new LLMConfigurationRepositoryCache(mockCache, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    describe('when saving OpenAI config with apiKey', () => {
      it('encrypts the apiKey before storing', async () => {
        const config: LLMServiceConfig = {
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key',
          model: 'gpt-4',
        };

        await repository.save(organizationId, config);

        expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
          'sk-test-key',
        );
      });

      it('stores the encrypted config in cache', async () => {
        const config: LLMServiceConfig = {
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key',
        };

        await repository.save(organizationId, config);

        expect(mockCache.set).toHaveBeenCalledWith(
          `llm-config:${organizationId}`,
          expect.objectContaining({
            config: expect.objectContaining({
              provider: LLMProvider.OPENAI,
              apiKey: 'encrypted:sk-test-key',
            }),
            configuredAt: expect.any(Date),
          }),
          86400,
        );
      });
    });

    describe('when saving OpenAI-compatible config with llmApiKey', () => {
      it('encrypts the llmApiKey before storing', async () => {
        const config: LLMServiceConfig = {
          provider: LLMProvider.OPENAI_COMPATIBLE,
          llmApiKey: 'custom-api-key',
          llmEndpoint: 'https://custom.endpoint.com',
          model: 'custom-model',
          fastestModel: 'custom-fast-model',
        };

        await repository.save(organizationId, config);

        expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
          'custom-api-key',
        );
      });
    });

    describe('when saving Packmind config without secrets', () => {
      it('does not call encryption service for secrets', async () => {
        const config: LLMServiceConfig = {
          provider: LLMProvider.PACKMIND,
        };

        await repository.save(organizationId, config);

        expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
      });
    });

    describe('when cache set fails', () => {
      it('throws the error', async () => {
        const config: LLMServiceConfig = {
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key',
        };

        mockCache.set.mockRejectedValue(new Error('Cache error'));

        await expect(repository.save(organizationId, config)).rejects.toThrow(
          'Cache error',
        );
      });
    });

    it('uses correct TTL of 24 hours', async () => {
      const config: LLMServiceConfig = {
        provider: LLMProvider.OPENAI,
        apiKey: 'sk-test-key',
      };

      await repository.save(organizationId, config);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        86400,
      );
    });

    it('uses correct cache key format', async () => {
      const config: LLMServiceConfig = {
        provider: LLMProvider.OPENAI,
        apiKey: 'sk-test-key',
      };

      await repository.save(organizationId, config);

      expect(mockCache.set).toHaveBeenCalledWith(
        `llm-config:${organizationId}`,
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('get', () => {
    describe('when config exists', () => {
      it('decrypts the apiKey', async () => {
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'encrypted:sk-test-key',
          },
          configuredAt: new Date(),
        };

        mockCache.get.mockResolvedValue(storedConfig);

        await repository.get(organizationId);

        expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
          'encrypted:sk-test-key',
        );
      });

      it('returns the decrypted config', async () => {
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'encrypted:sk-test-key',
          },
          configuredAt: new Date('2024-01-01'),
        };

        mockCache.get.mockResolvedValue(storedConfig);

        const result = await repository.get(organizationId);

        expect(result?.config).toEqual({
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-test-key',
        });
      });

      it('returns the configuredAt date', async () => {
        const configuredAt = new Date('2024-01-01T10:00:00Z');
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.PACKMIND,
          },
          configuredAt,
        };

        mockCache.get.mockResolvedValue(storedConfig);

        const result = await repository.get(organizationId);

        expect(result?.configuredAt).toEqual(configuredAt);
      });
    });

    describe('when config has llmApiKey', () => {
      it('decrypts the llmApiKey', async () => {
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.OPENAI_COMPATIBLE,
            llmApiKey: 'encrypted:custom-key',
            llmEndpoint: 'https://custom.endpoint.com',
            model: 'model',
            fastestModel: 'fast-model',
          },
          configuredAt: new Date(),
        };

        mockCache.get.mockResolvedValue(storedConfig);

        await repository.get(organizationId);

        expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
          'encrypted:custom-key',
        );
      });
    });

    describe('when config does not exist', () => {
      it('returns null', async () => {
        mockCache.get.mockResolvedValue(null);

        const result = await repository.get(organizationId);

        expect(result).toBeNull();
      });
    });

    describe('when cache get fails', () => {
      it('throws the error', async () => {
        mockCache.get.mockRejectedValue(new Error('Cache error'));

        await expect(repository.get(organizationId)).rejects.toThrow(
          'Cache error',
        );
      });
    });

    describe('when config has no secrets', () => {
      it('returns config without decryption attempts', async () => {
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.PACKMIND,
          },
          configuredAt: new Date(),
        };

        mockCache.get.mockResolvedValue(storedConfig);

        const result = await repository.get(organizationId);

        expect(result?.config).toEqual({
          provider: LLMProvider.PACKMIND,
        });
      });
    });
  });

  describe('exists', () => {
    describe('when config exists', () => {
      it('returns true', async () => {
        const storedConfig: StoredLLMConfiguration = {
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'encrypted:sk-test-key',
          },
          configuredAt: new Date(),
        };

        mockCache.get.mockResolvedValue(storedConfig);

        const result = await repository.exists(organizationId);

        expect(result).toBe(true);
      });
    });

    describe('when config does not exist', () => {
      it('returns false', async () => {
        mockCache.get.mockResolvedValue(null);

        const result = await repository.exists(organizationId);

        expect(result).toBe(false);
      });
    });

    describe('when cache get fails', () => {
      it('throws the error', async () => {
        mockCache.get.mockRejectedValue(new Error('Cache error'));

        await expect(repository.exists(organizationId)).rejects.toThrow(
          'Cache error',
        );
      });
    });
  });
});
