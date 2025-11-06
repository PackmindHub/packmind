import { GitProvider, GitProviderId } from '../../domain/entities/GitProvider';
import { IGitProviderRepository } from '../../domain/repositories/IGitProviderRepository';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  EncryptionService,
  Configuration,
  AbstractRepository,
} from '@packmind/node-utils';
import { QueryOption } from '@packmind/types';
import { OrganizationId } from '@packmind/accounts';

const origin = 'GitProviderRepository';

export class GitProviderRepository
  extends AbstractRepository<GitProvider>
  implements IGitProviderRepository
{
  private encryptionService: EncryptionService | null = null;

  constructor(
    repository: Repository<GitProvider> = localDataSource.getRepository<GitProvider>(
      GitProviderSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('gitProvider', repository, logger, GitProviderSchema);
    this.logger.info('GitProviderRepository initialized');
  }

  protected override loggableEntity(entity: GitProvider): Partial<GitProvider> {
    return {
      id: entity.id,
      url: entity.url,
    };
  }

  /**
   * Get or create the EncryptionService with the encryption key from Configuration
   */
  private async getEncryptionService(): Promise<EncryptionService> {
    if (!this.encryptionService) {
      const encryptionKey = await Configuration.getConfig('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not found in configuration');
      }
      this.encryptionService = new EncryptionService(encryptionKey);
    }
    return this.encryptionService;
  }

  /**
   * Encrypt the token field in a GitProvider before saving to database
   */
  private async encryptGitProvider(
    gitProvider: GitProvider,
  ): Promise<GitProvider> {
    if (!gitProvider.token) {
      return gitProvider;
    }

    const encryptionService = await this.getEncryptionService();
    return {
      ...gitProvider,
      token: encryptionService.encrypt(gitProvider.token),
    };
  }

  /**
   * Decrypt the token field in a GitProvider after reading from database
   */
  private async decryptGitProvider(
    gitProvider: GitProvider,
  ): Promise<GitProvider> {
    if (!gitProvider.token) {
      return gitProvider;
    }

    const encryptionService = await this.getEncryptionService();
    return {
      ...gitProvider,
      token: encryptionService.decrypt(gitProvider.token),
    };
  }

  override async add(gitProvider: GitProvider): Promise<GitProvider> {
    this.logger.info('Adding git provider', this.loggableEntity(gitProvider));

    try {
      const encryptedGitProvider = await this.encryptGitProvider(gitProvider);
      const result = await super.add(encryptedGitProvider);
      const decryptedResult = await this.decryptGitProvider(result);

      this.logger.info('Git provider added successfully', {
        id: decryptedResult.id,
      });
      return decryptedResult;
    } catch (error) {
      this.logger.error('Failed to add git provider', {
        gitProvider: this.loggableEntity(gitProvider),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(
    id: GitProviderId,
    opts?: QueryOption,
  ): Promise<GitProvider | null> {
    this.logger.info('Finding git provider by ID', { id });

    try {
      const result = await super.findById(id, opts);
      if (!result) return result;

      const decryptedResult = await this.decryptGitProvider(result);
      this.logger.info('Git provider found by ID', { id });
      return decryptedResult;
    } catch (error) {
      this.logger.error('Failed to find git provider by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<GitProvider[]> {
    this.logger.info('Finding git providers by organization ID', {
      organizationId,
    });

    try {
      const results = await this.repository.find({
        where: { organizationId },
        relations: ['repos'],
      });

      // Decrypt all results
      const decryptedResults = await Promise.all(
        results.map((result) => this.decryptGitProvider(result)),
      );

      this.logger.info('Git providers found by organization ID', {
        organizationId,
        count: decryptedResults.length,
      });
      return decryptedResults;
    } catch (error) {
      this.logger.error('Failed to find git providers by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(organizationId?: OrganizationId): Promise<GitProvider[]> {
    this.logger.info('Listing git providers', { organizationId });

    try {
      if (organizationId) {
        return this.findByOrganizationId(organizationId);
      }

      const results = await this.repository.find({
        relations: ['repos'],
      });

      // Decrypt all results
      const decryptedResults = await Promise.all(
        results.map((result) => this.decryptGitProvider(result)),
      );

      this.logger.info('Git providers listed successfully', {
        count: decryptedResults.length,
      });
      return decryptedResults;
    } catch (error) {
      this.logger.error('Failed to list git providers', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async update(
    id: string,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider> {
    this.logger.info('Updating git provider', { id });

    try {
      // Find the existing provider to ensure it exists
      const existingProvider = await this.repository.findOneBy({
        id: id as GitProviderId,
      });
      if (!existingProvider) {
        throw new Error(`Git provider with id ${id} not found`);
      }

      // Merge the existing provider with the update data
      const updatedProvider: GitProvider = {
        ...existingProvider,
        ...gitProvider,
        id: id as GitProviderId, // Ensure id is preserved
      };

      // Encrypt the provider if token is being updated
      const encryptedProvider = await this.encryptGitProvider(updatedProvider);

      // Save the updated provider
      const result = await this.repository.save(encryptedProvider);

      // Return the decrypted provider
      const decryptedResult = await this.decryptGitProvider(result);
      this.logger.info('Git provider updated successfully', { id });
      return decryptedResult;
    } catch (error) {
      this.logger.error('Failed to update git provider', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
