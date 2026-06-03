import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import {
  softDeleteMigrationColumns,
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddGitHubAppSchema1780404152009';

export class AddGitHubAppSchema1780404152009 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly organizationGitHubAppsTable = new Table({
    name: 'organization_github_apps',
    columns: [
      uuidMigrationColumn,
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'app_id',
        type: 'bigint',
        isNullable: false,
      },
      {
        name: 'app_slug',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'app_client_id',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'app_client_secret',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'app_private_key',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'app_webhook_secret',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'revoked_at',
        type: 'timestamptz',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly organizationGitHubAppsOrgForeignKey = new TableForeignKey({
    name: 'FK_organization_github_apps_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly organizationGitHubAppsOrgIndex = new TableIndex({
    name: 'IDX_org_github_app_organization_id',
    columnNames: ['organization_id'],
  });

  private readonly gitProvidersOrgGitHubAppForeignKey = new TableForeignKey({
    name: 'FK_git_providers_organization_github_app',
    columnNames: ['organization_github_app_id'],
    referencedTableName: 'organization_github_apps',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
  });

  private readonly gitProvidersOrgGitHubAppIndex = new TableIndex({
    name: 'IDX_git_providers_organization_github_app_id',
    columnNames: ['organization_github_app_id'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitHubAppSchema');

    try {
      this.logger.debug('Creating organization_github_apps table');
      await queryRunner.createTable(this.organizationGitHubAppsTable);

      this.logger.debug(
        'Adding FK organization_github_apps.organization_id -> organizations.id',
      );
      await queryRunner.createForeignKey(
        'organization_github_apps',
        this.organizationGitHubAppsOrgForeignKey,
      );

      this.logger.debug('Indexing organization_github_apps.organization_id');
      await queryRunner.createIndex(
        'organization_github_apps',
        this.organizationGitHubAppsOrgIndex,
      );

      this.logger.debug('Adding GitHub App auth columns to git_providers');
      await queryRunner.query(`
        ALTER TABLE "git_providers"
          ADD COLUMN "auth_method"                varchar(16) NOT NULL DEFAULT 'token',
          ADD COLUMN "app_installation_id"        bigint      NULL,
          ADD COLUMN "revoked_at"                 timestamptz NULL,
          ADD COLUMN "organization_github_app_id" uuid        NULL
      `);

      // No CHECK constraint on (auth_method = 'app' => org_github_app_id IS
      // NOT NULL): cloud edition uses a shared env-configured App and has no
      // per-org OrganizationGitHubApp row, so cloud app-auth providers leave
      // this column NULL. The OSS edition enforces non-null via
      // `validateProviderCredentials` at the application layer.

      this.logger.debug(
        'Linking git_providers.organization_github_app_id -> organization_github_apps.id',
      );
      await queryRunner.createForeignKey(
        'git_providers',
        this.gitProvidersOrgGitHubAppForeignKey,
      );

      this.logger.debug('Indexing git_providers.organization_github_app_id');
      await queryRunner.createIndex(
        'git_providers',
        this.gitProvidersOrgGitHubAppIndex,
      );

      this.logger.info('Migration AddGitHubAppSchema completed successfully');
    } catch (error) {
      this.logger.error('Migration AddGitHubAppSchema failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGitHubAppSchema');

    try {
      this.logger.debug(
        'Dropping index git_providers.organization_github_app_id',
      );
      await queryRunner.dropIndex(
        'git_providers',
        this.gitProvidersOrgGitHubAppIndex,
      );

      this.logger.debug(
        'Dropping FK git_providers.organization_github_app_id -> organization_github_apps.id',
      );
      await queryRunner.dropForeignKey(
        'git_providers',
        this.gitProvidersOrgGitHubAppForeignKey,
      );

      this.logger.debug('Dropping GitHub App auth columns from git_providers');
      await queryRunner.query(`
        ALTER TABLE "git_providers"
          DROP COLUMN IF EXISTS "organization_github_app_id",
          DROP COLUMN IF EXISTS "revoked_at",
          DROP COLUMN IF EXISTS "app_installation_id",
          DROP COLUMN IF EXISTS "auth_method"
      `);

      this.logger.debug(
        'Dropping index organization_github_apps.organization_id',
      );
      await queryRunner.dropIndex(
        'organization_github_apps',
        this.organizationGitHubAppsOrgIndex,
      );

      this.logger.debug(
        'Dropping FK organization_github_apps.organization_id -> organizations.id',
      );
      await queryRunner.dropForeignKey(
        'organization_github_apps',
        this.organizationGitHubAppsOrgForeignKey,
      );

      this.logger.debug('Dropping organization_github_apps table');
      await queryRunner.dropTable('organization_github_apps', true);

      this.logger.info('Rollback AddGitHubAppSchema completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddGitHubAppSchema failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
