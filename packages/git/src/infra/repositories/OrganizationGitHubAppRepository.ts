import {
  OrganizationGitHubApp,
  OrganizationGitHubAppId,
} from '@packmind/types';
import { IOrganizationGitHubAppRepository } from '../../domain/repositories/IOrganizationGitHubAppRepository';
import { OrganizationGitHubAppSchema } from '../schemas/OrganizationGitHubAppSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  EncryptionService,
  Configuration,
  AbstractRepository,
} from '@packmind/node-utils';
import { OrganizationId } from '@packmind/types';
import { QueryOption } from '@packmind/types';

const origin = 'OrganizationGitHubAppRepository';

export class OrganizationGitHubAppRepository
  extends AbstractRepository<OrganizationGitHubApp>
  implements IOrganizationGitHubAppRepository
{
  private encryptionService: EncryptionService | null = null;

  constructor(
    repository: Repository<OrganizationGitHubApp> = localDataSource.getRepository<OrganizationGitHubApp>(
      OrganizationGitHubAppSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'organizationGitHubApp',
      repository,
      OrganizationGitHubAppSchema,
      logger,
    );
    this.logger.info('OrganizationGitHubAppRepository initialized');
  }

  protected override loggableEntity(
    entity: OrganizationGitHubApp,
  ): Partial<OrganizationGitHubApp> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      appSlug: entity.appSlug,
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

  private async encryptApp(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp> {
    const encryptionService = await this.getEncryptionService();
    const next: OrganizationGitHubApp = { ...app };

    if (
      next.appClientSecret &&
      !encryptionService.isEncrypted(next.appClientSecret)
    ) {
      next.appClientSecret = encryptionService.encrypt(next.appClientSecret);
    }

    if (
      next.appPrivateKey &&
      !encryptionService.isEncrypted(next.appPrivateKey)
    ) {
      next.appPrivateKey = encryptionService.encrypt(next.appPrivateKey);
    }

    if (
      next.appWebhookSecret &&
      !encryptionService.isEncrypted(next.appWebhookSecret)
    ) {
      next.appWebhookSecret = encryptionService.encrypt(next.appWebhookSecret);
    }

    return next;
  }

  private async decryptApp(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp> {
    const encryptionService = await this.getEncryptionService();
    const next: OrganizationGitHubApp = { ...app };

    if (next.appClientSecret) {
      next.appClientSecret = encryptionService.decrypt(next.appClientSecret);
    }

    if (next.appPrivateKey) {
      next.appPrivateKey = encryptionService.decrypt(next.appPrivateKey);
    }

    if (next.appWebhookSecret) {
      next.appWebhookSecret = encryptionService.decrypt(next.appWebhookSecret);
    }

    return next;
  }

  override async add(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp> {
    this.logger.info(
      'Adding organization GitHub App',
      this.loggableEntity(app),
    );

    try {
      const encrypted = await this.encryptApp(app);
      const result = await super.add(encrypted);
      const decrypted = await this.decryptApp(result);

      this.logger.info('Organization GitHub App added successfully', {
        id: decrypted.id,
      });
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to add organization GitHub App', {
        app: this.loggableEntity(app),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(
    id: OrganizationGitHubAppId,
    opts?: QueryOption,
  ): Promise<OrganizationGitHubApp | null> {
    this.logger.info('Finding organization GitHub App by ID', { id });

    try {
      const result = await super.findById(id, opts);
      if (!result) return null;

      const decrypted = await this.decryptApp(result);
      this.logger.info('Organization GitHub App found by ID', { id });
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to find organization GitHub App by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null> {
    this.logger.info('Finding organization GitHub App by organization ID', {
      orgId,
    });

    try {
      const result = await this.repository
        .createQueryBuilder('app')
        .where('app.organizationId = :orgId', { orgId })
        .orderBy('app.createdAt', 'DESC')
        .getOne();

      if (!result) return null;

      const decrypted = await this.decryptApp(result);
      this.logger.info('Organization GitHub App found by organization ID', {
        orgId,
      });
      return decrypted;
    } catch (error) {
      this.logger.error(
        'Failed to find organization GitHub App by organization ID',
        {
          orgId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findActiveByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null> {
    this.logger.info(
      'Finding active organization GitHub App by organization ID',
      { orgId },
    );

    try {
      const result = await this.repository
        .createQueryBuilder('app')
        .where('app.organizationId = :orgId', { orgId })
        .andWhere('app.revokedAt IS NULL')
        .getOne();

      if (!result) return null;

      const decrypted = await this.decryptApp(result);
      this.logger.info(
        'Active organization GitHub App found by organization ID',
        { orgId },
      );
      return decrypted;
    } catch (error) {
      this.logger.error(
        'Failed to find active organization GitHub App by organization ID',
        {
          orgId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async markRevoked(orgId: OrganizationId): Promise<void> {
    this.logger.info('Marking organization GitHub App as revoked', { orgId });

    try {
      await this.repository
        .createQueryBuilder()
        .update()
        .set({ revokedAt: new Date() })
        .where('organizationId = :orgId', { orgId })
        .andWhere('revokedAt IS NULL')
        .execute();

      this.logger.info('Organization GitHub App marked as revoked', { orgId });
    } catch (error) {
      this.logger.error('Failed to mark organization GitHub App as revoked', {
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async upsertForOrganization(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp> {
    this.logger.info(
      'Upserting organization GitHub App for organization',
      this.loggableEntity(app),
    );

    try {
      let result!: OrganizationGitHubApp;

      await this.repository.manager.transaction(async (manager) => {
        // Revoke any existing active record for this org
        await manager
          .createQueryBuilder()
          .update(OrganizationGitHubAppSchema)
          .set({ revokedAt: new Date() })
          .where('organizationId = :orgId', { orgId: app.organizationId })
          .andWhere('revokedAt IS NULL')
          .execute();

        // Encrypt and insert the new record
        const encrypted = await this.encryptApp(app);
        result = await manager.save(OrganizationGitHubAppSchema, encrypted);
      });

      const decrypted = await this.decryptApp(result);
      this.logger.info('Organization GitHub App upserted successfully', {
        id: decrypted.id,
      });
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to upsert organization GitHub App', {
        app: this.loggableEntity(app),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
