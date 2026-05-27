import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddGithubAppConfigTable1779000000000';

export class AddGithubAppConfigTable1779000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly githubAppConfigsTable = new Table({
    name: 'github_app_configs',
    columns: [
      uuidMigrationColumn,
      {
        name: 'app_id',
        type: 'bigint',
        isNullable: false,
      },
      {
        name: 'slug',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'html_url',
        type: 'varchar',
        length: '512',
        isNullable: false,
      },
      {
        name: 'client_id',
        type: 'varchar',
        length: '255',
        isNullable: false,
      },
      {
        name: 'client_secret',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'private_key',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'webhook_secret',
        type: 'text',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGithubAppConfigTable');

    try {
      this.logger.debug('Creating github_app_configs table');
      await queryRunner.createTable(this.githubAppConfigsTable);

      this.logger.debug('Creating unique index on github_app_configs.app_id');
      await queryRunner.query(
        'CREATE UNIQUE INDEX "idx_github_app_configs_app_id" ON "github_app_configs" ("app_id") WHERE deleted_at IS NULL',
      );

      this.logger.info(
        'Migration AddGithubAppConfigTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddGithubAppConfigTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGithubAppConfigTable');

    try {
      this.logger.debug('Dropping unique index on github_app_configs.app_id');
      await queryRunner.query('DROP INDEX "idx_github_app_configs_app_id"');

      this.logger.debug('Dropping github_app_configs table');
      await queryRunner.dropTable(this.githubAppConfigsTable);

      this.logger.info(
        'Rollback AddGithubAppConfigTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddGithubAppConfigTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
