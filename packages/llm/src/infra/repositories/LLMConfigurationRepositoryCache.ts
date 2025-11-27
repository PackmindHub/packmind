import { LLMServiceConfig, OrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Cache, Configuration, EncryptionService } from '@packmind/node-utils';
import {
  ILLMConfigurationRepository,
  StoredLLMConfiguration,
} from '../../domain/repositories/ILLMConfigurationRepository';

const origin = 'LLMConfigurationRepositoryCache';

export class LLMConfigurationRepositoryCache
  implements ILLMConfigurationRepository
{
  private static readonly TTL_SECONDS = 86400; // 24 hours
  private encryptionService: EncryptionService | null = null;

  constructor(
    private readonly cache: Cache = Cache.getInstance(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LLMConfigurationRepositoryCache initialized');
  }

  private getCacheKey(organizationId: OrganizationId): string {
    return `llm-config:${organizationId}`;
  }

  private async getEncryptionService(): Promise<EncryptionService> {
    if (!this.encryptionService) {
      const encryptionKey =
        (await Configuration.getConfig('ENCRYPTION_KEY')) || 'ENCRYPTION_KEY';
      this.encryptionService = new EncryptionService(encryptionKey);
    }
    return this.encryptionService;
  }

  private hasApiKey(
    config: LLMServiceConfig,
  ): config is LLMServiceConfig & { apiKey: string } {
    return 'apiKey' in config && typeof config.apiKey === 'string';
  }

  private hasLlmApiKey(
    config: LLMServiceConfig,
  ): config is LLMServiceConfig & { llmApiKey: string } {
    return 'llmApiKey' in config && typeof config.llmApiKey === 'string';
  }

  private async encryptSecrets(
    config: LLMServiceConfig,
  ): Promise<LLMServiceConfig> {
    const encryptionService = await this.getEncryptionService();
    const encryptedConfig = { ...config } as LLMServiceConfig;

    if (this.hasApiKey(config) && config.apiKey) {
      (encryptedConfig as { apiKey: string }).apiKey =
        encryptionService.encrypt(config.apiKey);
    }

    if (this.hasLlmApiKey(config) && config.llmApiKey) {
      (encryptedConfig as { llmApiKey: string }).llmApiKey =
        encryptionService.encrypt(config.llmApiKey);
    }

    return encryptedConfig;
  }

  private async decryptSecrets(
    config: LLMServiceConfig,
  ): Promise<LLMServiceConfig> {
    const encryptionService = await this.getEncryptionService();
    const decryptedConfig = { ...config } as LLMServiceConfig;

    if (this.hasApiKey(config) && config.apiKey) {
      (decryptedConfig as { apiKey: string }).apiKey =
        encryptionService.decrypt(config.apiKey);
    }

    if (this.hasLlmApiKey(config) && config.llmApiKey) {
      (decryptedConfig as { llmApiKey: string }).llmApiKey =
        encryptionService.decrypt(config.llmApiKey);
    }

    return decryptedConfig;
  }

  async save(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId);

    try {
      const encryptedConfig = await this.encryptSecrets(config);
      const storedConfig: StoredLLMConfiguration = {
        config: encryptedConfig,
        configuredAt: new Date(),
      };

      await this.cache.set(
        cacheKey,
        storedConfig,
        LLMConfigurationRepositoryCache.TTL_SECONDS,
      );

      this.logger.info('LLM configuration saved', {
        organizationId,
        provider: config.provider,
      });
    } catch (error) {
      this.logger.error('Failed to save LLM configuration', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async get(
    organizationId: OrganizationId,
  ): Promise<StoredLLMConfiguration | null> {
    const cacheKey = this.getCacheKey(organizationId);

    try {
      const storedConfig =
        await this.cache.get<StoredLLMConfiguration>(cacheKey);

      if (!storedConfig) {
        return null;
      }

      const decryptedConfig = await this.decryptSecrets(storedConfig.config);

      return {
        config: decryptedConfig,
        configuredAt: new Date(storedConfig.configuredAt),
      };
    } catch (error) {
      this.logger.error('Failed to get LLM configuration', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async exists(organizationId: OrganizationId): Promise<boolean> {
    const cacheKey = this.getCacheKey(organizationId);

    try {
      const storedConfig =
        await this.cache.get<StoredLLMConfiguration>(cacheKey);
      return storedConfig !== null;
    } catch (error) {
      this.logger.error('Failed to check LLM configuration existence', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
