import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  AIProvider,
  LLMServiceConfig,
  OrganizationId,
  createAIProviderId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractRepository,
  localDataSource,
  Configuration,
  EncryptionService,
} from '@packmind/node-utils';
import {
  IAIProviderRepository,
  StoredAIProvider,
} from '../../domain/repositories/IAIProviderRepository';
import { AIProviderSchema } from '../schemas/AIProviderSchema';

const origin = 'AIProviderRepository';

export class AIProviderRepository
  extends AbstractRepository<AIProvider>
  implements IAIProviderRepository
{
  private encryptionService: EncryptionService | null = null;

  constructor(
    repository: Repository<AIProvider> = localDataSource.getRepository<AIProvider>(
      AIProviderSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('aiProvider', repository, logger, AIProviderSchema);
    this.logger.info('AIProviderRepository initialized');
  }

  protected override loggableEntity(entity: AIProvider): Partial<AIProvider> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
    };
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
    this.logger.info('Saving AI provider configuration', {
      organizationId,
      provider: config.provider,
    });

    try {
      const encryptedConfig = await this.encryptSecrets(config);

      const existing = await this.findByOrganizationId(organizationId);

      if (existing) {
        await this.repository.save({
          ...existing,
          config: encryptedConfig,
        });

        this.logger.info('AI provider configuration updated', {
          organizationId,
          provider: config.provider,
        });
      } else {
        const newConfiguration: AIProvider = {
          id: createAIProviderId(uuidv4()),
          organizationId,
          config: encryptedConfig,
        };

        await this.repository.save(newConfiguration);

        this.logger.info('AI provider configuration created', {
          organizationId,
          provider: config.provider,
        });
      }
    } catch (error) {
      this.logger.error('Failed to save AI provider configuration', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async get(organizationId: OrganizationId): Promise<StoredAIProvider | null> {
    this.logger.info('Getting AI provider configuration', { organizationId });

    try {
      const configuration = await this.findByOrganizationId(organizationId);

      if (!configuration) {
        this.logger.info('No AI provider configuration found', {
          organizationId,
        });
        return null;
      }

      const decryptedConfig = await this.decryptSecrets(configuration.config);

      return {
        config: decryptedConfig,
      };
    } catch (error) {
      this.logger.error('Failed to get AI provider configuration', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async exists(organizationId: OrganizationId): Promise<boolean> {
    this.logger.info('Checking AI provider configuration existence', {
      organizationId,
    });

    try {
      const configuration = await this.findByOrganizationId(organizationId);
      return configuration !== null;
    } catch (error) {
      this.logger.error('Failed to check AI provider configuration existence', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<AIProvider | null> {
    try {
      const configuration = await this.repository.findOne({
        where: { organizationId },
      });

      return configuration;
    } catch (error) {
      this.logger.error(
        'Failed to find AI provider configuration by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
