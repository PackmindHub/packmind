import { GitHubAppConfig, createGitHubAppConfigId } from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../domain/repositories/IGitHubAppConfigRepository';
import { GitHubAppConfigSchema } from '../schemas/GitHubAppConfigSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  EncryptionService,
  Configuration,
  AbstractRepository,
} from '@packmind/node-utils';
import { v4 as uuidv4 } from 'uuid';

const origin = 'GitHubAppConfigRepository';

export class GitHubAppConfigRepository
  extends AbstractRepository<GitHubAppConfig>
  implements IGitHubAppConfigRepository
{
  private encryptionService: EncryptionService | null = null;

  constructor(
    repository: Repository<GitHubAppConfig> = localDataSource.getRepository<GitHubAppConfig>(
      GitHubAppConfigSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('gitHubAppConfig', repository, GitHubAppConfigSchema, logger);
    this.logger.info('GitHubAppConfigRepository initialized');
  }

  protected override loggableEntity(
    entity: GitHubAppConfig,
  ): Partial<GitHubAppConfig> {
    return {
      id: entity.id,
      slug: entity.slug,
      appId: entity.appId,
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

  private async encryptConfig(
    config: GitHubAppConfig,
  ): Promise<GitHubAppConfig> {
    const encryptionService = await this.getEncryptionService();
    return {
      ...config,
      clientSecret: encryptionService.encrypt(config.clientSecret),
      privateKey: encryptionService.encrypt(config.privateKey),
      webhookSecret: encryptionService.encrypt(config.webhookSecret),
    };
  }

  private async decryptConfig(
    config: GitHubAppConfig,
  ): Promise<GitHubAppConfig> {
    const encryptionService = await this.getEncryptionService();
    return {
      ...config,
      clientSecret: encryptionService.decrypt(config.clientSecret),
      privateKey: encryptionService.decrypt(config.privateKey),
      webhookSecret: encryptionService.decrypt(config.webhookSecret),
    };
  }

  async findActive(): Promise<GitHubAppConfig | null> {
    this.logger.info('Finding active GitHub App config');

    try {
      const result = await this.repository.findOne({
        where: {},
        order: { createdAt: 'DESC' } as never,
      });

      if (!result) return null;

      const decrypted = await this.decryptConfig(result);
      this.logger.info('Active GitHub App config found');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to find active GitHub App config', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async save(config: Omit<GitHubAppConfig, 'id'>): Promise<GitHubAppConfig> {
    this.logger.info('Saving GitHub App config', { slug: config.slug });

    try {
      const configWithId: GitHubAppConfig = {
        ...config,
        id: createGitHubAppConfigId(uuidv4()),
      };

      const encrypted = await this.encryptConfig(configWithId);
      const result = await super.add(encrypted);
      const decrypted = await this.decryptConfig(result);

      this.logger.info('GitHub App config saved successfully', {
        id: decrypted.id,
      });
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to save GitHub App config', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteActive(): Promise<void> {
    this.logger.info('Deleting active GitHub App config');

    try {
      const active = await this.repository.findOne({
        where: {},
        order: { createdAt: 'DESC' } as never,
      });

      if (!active) {
        this.logger.warn('No active GitHub App config found for deletion');
        return;
      }

      await this.deleteById(active.id);
      this.logger.info('Active GitHub App config deleted');
    } catch (error) {
      this.logger.error('Failed to delete active GitHub App config', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
