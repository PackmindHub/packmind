import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddMarketplaceDistributionsTable1805000000000';

/**
 * Migration: AddMarketplaceDistributionsTable
 *
 * Creates the `marketplace_distributions` table that records every attempt
 * to publish a Packmind package as a managed plugin on a linked
 * marketplace. Mirrors the code-repository `distributions` shape.
 *
 * Schema changes:
 *   1. Create the `marketplace_distributions` table with the columns
 *      described in `MarketplaceDistributionSchema`: organization_id,
 *      marketplace_id, package_id, plugin_slug, author_id, status, source,
 *      pr_url (nullable), git_commit (nullable), error (nullable),
 *      failure_reason (nullable), content_hash (nullable), plus timestamps
 *      and soft-delete columns.
 *   2. Foreign keys: organization (CASCADE), marketplace (CASCADE),
 *      package (CASCADE), users / author (RESTRICT).
 *   3. Indexes: marketplace_id, (package_id, marketplace_id), status.
 *
 * No ALTER on the `marketplaces` table — the new `packmindLock` field
 * lives inside the existing JSONB `descriptor` column. The
 * `failure_reason` column is a `varchar` rather than a PG enum so future
 * `PublishFailureReason` literals can be added without an ALTER TYPE
 * dance.
 */
export class AddMarketplaceDistributionsTable1805000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly marketplaceDistributionsTable = new Table({
    name: 'marketplace_distributions',
    columns: [
      uuidMigrationColumn,
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'marketplace_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'package_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'plugin_slug',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'author_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'status',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'source',
        type: 'varchar',
        isNullable: false,
        default: `'app'`,
      },
      {
        name: 'pr_url',
        type: 'text',
        isNullable: true,
      },
      {
        name: 'git_commit',
        type: 'varchar',
        isNullable: true,
      },
      {
        name: 'error',
        type: 'text',
        isNullable: true,
      },
      {
        name: 'failure_reason',
        type: 'varchar',
        isNullable: true,
      },
      {
        name: 'content_hash',
        type: 'varchar',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly organizationForeignKey = new TableForeignKey({
    name: 'FK_marketplace_distributions_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly marketplaceForeignKey = new TableForeignKey({
    name: 'FK_marketplace_distributions_marketplace',
    columnNames: ['marketplace_id'],
    referencedTableName: 'marketplaces',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly packageForeignKey = new TableForeignKey({
    name: 'FK_marketplace_distributions_package',
    columnNames: ['package_id'],
    referencedTableName: 'packages',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly authorForeignKey = new TableForeignKey({
    name: 'FK_marketplace_distributions_author',
    columnNames: ['author_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMarketplaceDistributionsTable');

    try {
      // 1. Create the marketplace_distributions table
      this.logger.debug('Creating marketplace_distributions table');
      await queryRunner.createTable(this.marketplaceDistributionsTable);

      this.logger.debug(
        'Adding foreign key marketplace_distributions -> organizations',
      );
      await queryRunner.createForeignKey(
        'marketplace_distributions',
        this.organizationForeignKey,
      );

      this.logger.debug(
        'Adding foreign key marketplace_distributions -> marketplaces',
      );
      await queryRunner.createForeignKey(
        'marketplace_distributions',
        this.marketplaceForeignKey,
      );

      this.logger.debug(
        'Adding foreign key marketplace_distributions -> packages',
      );
      await queryRunner.createForeignKey(
        'marketplace_distributions',
        this.packageForeignKey,
      );

      this.logger.debug(
        'Adding foreign key marketplace_distributions -> users (author_id)',
      );
      await queryRunner.createForeignKey(
        'marketplace_distributions',
        this.authorForeignKey,
      );

      // 2. Create indexes on marketplace_distributions
      this.logger.debug(
        'Creating idx_marketplace_distributions_marketplace_id on marketplace_distributions (marketplace_id)',
      );
      await queryRunner.query(
        `CREATE INDEX "idx_marketplace_distributions_marketplace_id" ON "marketplace_distributions" ("marketplace_id")`,
      );

      this.logger.debug(
        'Creating idx_marketplace_distributions_package_marketplace on marketplace_distributions (package_id, marketplace_id)',
      );
      await queryRunner.query(
        `CREATE INDEX "idx_marketplace_distributions_package_marketplace" ON "marketplace_distributions" ("package_id", "marketplace_id")`,
      );

      this.logger.debug(
        'Creating idx_marketplace_distributions_status on marketplace_distributions (status)',
      );
      await queryRunner.query(
        `CREATE INDEX "idx_marketplace_distributions_status" ON "marketplace_distributions" ("status")`,
      );

      this.logger.info(
        'Migration AddMarketplaceDistributionsTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMarketplaceDistributionsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMarketplaceDistributionsTable');

    try {
      this.logger.debug('Dropping idx_marketplace_distributions_status');
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_marketplace_distributions_status"`,
      );

      this.logger.debug(
        'Dropping idx_marketplace_distributions_package_marketplace',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_marketplace_distributions_package_marketplace"`,
      );

      this.logger.debug(
        'Dropping idx_marketplace_distributions_marketplace_id',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_marketplace_distributions_marketplace_id"`,
      );

      this.logger.debug(
        'Dropping foreign key marketplace_distributions -> users',
      );
      await queryRunner.dropForeignKey(
        'marketplace_distributions',
        this.authorForeignKey,
      );

      this.logger.debug(
        'Dropping foreign key marketplace_distributions -> packages',
      );
      await queryRunner.dropForeignKey(
        'marketplace_distributions',
        this.packageForeignKey,
      );

      this.logger.debug(
        'Dropping foreign key marketplace_distributions -> marketplaces',
      );
      await queryRunner.dropForeignKey(
        'marketplace_distributions',
        this.marketplaceForeignKey,
      );

      this.logger.debug(
        'Dropping foreign key marketplace_distributions -> organizations',
      );
      await queryRunner.dropForeignKey(
        'marketplace_distributions',
        this.organizationForeignKey,
      );

      this.logger.debug('Dropping marketplace_distributions table');
      await queryRunner.dropTable('marketplace_distributions', true);

      this.logger.info(
        'Rollback AddMarketplaceDistributionsTable completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddMarketplaceDistributionsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
