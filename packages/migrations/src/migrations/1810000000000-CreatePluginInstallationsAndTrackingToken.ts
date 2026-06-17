import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import {
  uuidMigrationColumn,
  timestampsMigrationColumns,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreatePluginInstallationsAndTrackingToken1810000000000';

/**
 * Migration: CreatePluginInstallationsAndTrackingToken (rescheduled)
 *
 * Re-homes the work originally authored in
 * `1781624244359-CreatePluginInstallationsAndTrackingToken`, which carried a
 * timestamp earlier than `1804000000000-AddMarketplacesTableAndGitRepoType`
 * (the migration that creates the `marketplaces` table this one depends on).
 * In a clean environment that ordering made the original fail; in existing
 * environments it had already run because `marketplaces` was already present.
 *
 * This migration runs after the marketplace migrations and is fully
 * idempotent, so it is a no-op where the original already created the schema.
 */
export class CreatePluginInstallationsAndTrackingToken1810000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly pluginInstallationsTable = new Table({
    name: 'plugin_installations',
    columns: [
      { ...uuidMigrationColumn, default: 'gen_random_uuid()' },
      { name: 'organization_id', type: 'uuid', isNullable: false },
      { name: 'marketplace_id', type: 'uuid', isNullable: false },
      { name: 'plugin_slug', type: 'varchar', isNullable: false },
      { name: 'package_id', type: 'uuid', isNullable: true },
      { name: 'installed_version', type: 'varchar', isNullable: true },
      { name: 'scope', type: 'varchar', isNullable: false },
      { name: 'user_id', type: 'uuid', isNullable: true },
      { name: 'anonymous_id_hash', type: 'varchar', isNullable: true },
      { name: 'anonymous_email_masked', type: 'varchar', isNullable: true },
      {
        name: 'identity_key',
        type: 'varchar',
        isNullable: false,
        default: `''`,
      },
      { name: 'repo_remote_url', type: 'text', isNullable: true },
      { name: 'repo_key', type: 'varchar', isNullable: false, default: `''` },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
    foreignKeys: [
      new TableForeignKey({
        name: 'fk_plugin_installations_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_plugin_installations_marketplace',
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ],
    indices: [
      // UNIQUE index enforcing the absent-field key rule (§7.1). Postgres treats
      // NULLs as distinct in unique indexes — the NOT NULL '' fallback on
      // identity_key and repo_key makes the index work correctly.
      new TableIndex({
        name: 'uq_plugin_installations_unique_heartbeat',
        columnNames: [
          'marketplace_id',
          'plugin_slug',
          'scope',
          'identity_key',
          'repo_key',
        ],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
      new TableIndex({
        name: 'idx_plugin_installations_marketplace_id',
        columnNames: ['marketplace_id'],
      }),
      new TableIndex({
        name: 'idx_plugin_installations_organization_id',
        columnNames: ['organization_id'],
      }),
    ],
  });

  // tracking_token is nullable initially for backward compatibility; the
  // backfill below makes it effectively NOT NULL.
  private readonly trackingTokenColumn = new TableColumn({
    name: 'tracking_token',
    type: 'varchar',
    isNullable: true,
  });

  private readonly trackingTokenIndexName = 'idx_marketplace_tracking_token';

  private readonly trackingTokenIndex = new TableIndex({
    name: this.trackingTokenIndexName,
    columnNames: ['tracking_token'],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: CreatePluginInstallationsAndTrackingToken (rescheduled)',
    );

    try {
      // 1. Create plugin_installations table with its foreign keys and indices.
      //    ifNotExist=true makes the whole statement a no-op when the table
      //    already exists (e.g. environments where the original migration ran).
      this.logger.debug('Creating plugin_installations table');
      await queryRunner.createTable(
        this.pluginInstallationsTable,
        true,
        true,
        true,
      );

      // 2. Add tracking_token column to marketplaces if it is not already there.
      if (!(await queryRunner.hasColumn('marketplaces', 'tracking_token'))) {
        this.logger.debug('Adding tracking_token column to marketplaces');
        await queryRunner.addColumn('marketplaces', this.trackingTokenColumn);
      }

      // 3. Backfill tracking_token for marketplace rows that don't have one.
      //    gen_random_uuid() is built-in (Postgres 13+); no extension required.
      //    WHERE … IS NULL keeps this idempotent.
      this.logger.debug(
        'Backfilling tracking_token for existing marketplace rows',
      );
      await queryRunner.query(`
        UPDATE "marketplaces"
        SET "tracking_token" = replace(gen_random_uuid()::text, '-', '')
        WHERE "tracking_token" IS NULL
      `);

      // 4. Create the tracking-token lookup index if it does not already exist.
      const marketplaces = await queryRunner.getTable('marketplaces');
      if (
        !marketplaces?.indices.some(
          (index) => index.name === this.trackingTokenIndexName,
        )
      ) {
        this.logger.debug('Creating tracking_token index on marketplaces');
        await queryRunner.createIndex('marketplaces', this.trackingTokenIndex);
      }

      this.logger.info(
        'Migration CreatePluginInstallationsAndTrackingToken (rescheduled) completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration CreatePluginInstallationsAndTrackingToken (rescheduled) failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: CreatePluginInstallationsAndTrackingToken (rescheduled)',
    );

    try {
      // Reverse order — remove the marketplaces additions, then the table.

      const marketplaces = await queryRunner.getTable('marketplaces');
      if (
        marketplaces?.indices.some(
          (index) => index.name === this.trackingTokenIndexName,
        )
      ) {
        this.logger.debug('Dropping tracking_token index from marketplaces');
        await queryRunner.dropIndex(
          'marketplaces',
          this.trackingTokenIndexName,
        );
      }

      if (await queryRunner.hasColumn('marketplaces', 'tracking_token')) {
        this.logger.debug('Dropping tracking_token column from marketplaces');
        await queryRunner.dropColumn('marketplaces', 'tracking_token');
      }

      // ifExist=true → drops the table along with its foreign keys and indices.
      this.logger.debug('Dropping plugin_installations table');
      await queryRunner.dropTable('plugin_installations', true, true, true);

      this.logger.info(
        'Rollback CreatePluginInstallationsAndTrackingToken (rescheduled) completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback CreatePluginInstallationsAndTrackingToken (rescheduled) failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
