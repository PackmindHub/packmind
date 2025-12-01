import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateAIProvidersTable1764588153000';

export class CreateAIProvidersTable1764588153000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly aiProvidersTable = new Table({
    name: 'ai_providers',
    columns: [
      uuidMigrationColumn,
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'config',
        type: 'json',
        isNullable: false,
      },
      {
        name: 'configured_at',
        type: 'timestamp with time zone',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly organizationForeignKey = new TableForeignKey({
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_ai_providers_organization',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateAIProvidersTable');

    try {
      this.logger.debug('Creating ai_providers table');
      await queryRunner.createTable(this.aiProvidersTable);
      this.logger.info('Successfully created ai_providers table');

      this.logger.debug(
        'Creating unique index on organization_id for non-deleted records',
      );
      await queryRunner.createIndex(
        'ai_providers',
        new TableIndex({
          name: 'idx_ai_providers_organization',
          columnNames: ['organization_id'],
          isUnique: true,
          where: 'deleted_at IS NULL',
        }),
      );
      this.logger.info(
        'Successfully created unique index on ai_providers.organization_id',
      );

      this.logger.debug('Adding foreign key constraint to organizations table');
      await queryRunner.createForeignKey(
        'ai_providers',
        this.organizationForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint to organizations table',
      );

      this.logger.info(
        'Migration CreateAIProvidersTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateAIProvidersTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateAIProvidersTable');

    try {
      this.logger.debug(
        'Dropping foreign key constraint from ai_providers table',
      );
      await queryRunner.dropForeignKey(
        'ai_providers',
        this.organizationForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint from ai_providers table',
      );

      this.logger.debug('Dropping index on ai_providers.organization_id');
      await queryRunner.dropIndex(
        'ai_providers',
        'idx_ai_providers_organization',
      );
      this.logger.info(
        'Successfully dropped index on ai_providers.organization_id',
      );

      this.logger.debug('Dropping ai_providers table');
      await queryRunner.dropTable('ai_providers', true);
      this.logger.info('Successfully dropped ai_providers table');

      this.logger.info(
        'Rollback CreateAIProvidersTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateAIProvidersTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
