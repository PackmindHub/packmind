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

const origin = 'AddMarketplacesTableAndGitRepoType1804000000000';

/**
 * Migration: AddMarketplacesTableAndGitRepoType
 *
 * Schema changes:
 *   1. Add `type` column to `git_repos` (varchar NOT NULL DEFAULT 'standard').
 *      Uses the standard nullable-add → backfill → NOT NULL pattern so the
 *      column lands cleanly on existing rows.
 *   2. Create the `marketplaces` table mirroring `MarketplaceSchema`:
 *      `id`, `organization_id` (FK → organizations CASCADE),
 *      `git_repo_id` (FK → git_repos CASCADE),
 *      `name`, `vendor`, `added_by` (FK → users RESTRICT),
 *      `linked_at`, `state` (default 'healthy'), `last_validated_at`,
 *      `descriptor` (jsonb), `plugin_count` (default 0),
 *      plus timestamps + soft-delete columns.
 *      Indexes: `idx_marketplaces_organization_id` on `(organization_id)`;
 *      unique partial `uq_marketplaces_org_gitrepo_active`
 *      on `(organization_id, git_repo_id) WHERE deleted_at IS NULL`.
 */
export class AddMarketplacesTableAndGitRepoType1804000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly marketplacesTable = new Table({
    name: 'marketplaces',
    columns: [
      uuidMigrationColumn,
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'git_repo_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'name',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'vendor',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'added_by',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'linked_at',
        type: 'timestamp with time zone',
        isNullable: false,
      },
      {
        name: 'state',
        type: 'varchar',
        isNullable: false,
        default: `'healthy'`,
      },
      {
        name: 'last_validated_at',
        type: 'timestamp with time zone',
        isNullable: true,
      },
      {
        name: 'descriptor',
        type: 'jsonb',
        isNullable: false,
      },
      {
        name: 'plugin_count',
        type: 'integer',
        isNullable: false,
        default: 0,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly organizationForeignKey = new TableForeignKey({
    name: 'FK_marketplaces_organization',
    columnNames: ['organization_id'],
    referencedTableName: 'organizations',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly gitRepoForeignKey = new TableForeignKey({
    name: 'FK_marketplaces_git_repo',
    columnNames: ['git_repo_id'],
    referencedTableName: 'git_repos',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly addedByForeignKey = new TableForeignKey({
    name: 'FK_marketplaces_added_by',
    columnNames: ['added_by'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMarketplacesTableAndGitRepoType');

    try {
      // 1. Add `type` column to git_repos as nullable
      this.logger.debug('Adding nullable `type` column to git_repos table');
      await queryRunner.query(
        `ALTER TABLE "git_repos" ADD COLUMN "type" varchar NULL`,
      );

      // 2. Backfill existing rows to 'standard'
      this.logger.debug(
        "Backfilling existing git_repos rows with type = 'standard'",
      );
      await queryRunner.query(`UPDATE "git_repos" SET "type" = 'standard'`);

      // 3. Make column NOT NULL
      this.logger.debug('Setting NOT NULL constraint on git_repos.type column');
      await queryRunner.query(
        `ALTER TABLE "git_repos" ALTER COLUMN "type" SET NOT NULL`,
      );

      // 4. Set default for future inserts
      this.logger.debug("Setting default 'standard' on git_repos.type column");
      await queryRunner.query(
        `ALTER TABLE "git_repos" ALTER COLUMN "type" SET DEFAULT 'standard'`,
      );

      // 5. Create marketplaces table
      this.logger.debug('Creating marketplaces table');
      await queryRunner.createTable(this.marketplacesTable);

      this.logger.debug('Adding foreign key marketplaces -> organizations');
      await queryRunner.createForeignKey(
        'marketplaces',
        this.organizationForeignKey,
      );

      this.logger.debug('Adding foreign key marketplaces -> git_repos');
      await queryRunner.createForeignKey(
        'marketplaces',
        this.gitRepoForeignKey,
      );

      this.logger.debug('Adding foreign key marketplaces -> users (added_by)');
      await queryRunner.createForeignKey(
        'marketplaces',
        this.addedByForeignKey,
      );

      // 6. Create indexes on marketplaces
      this.logger.debug(
        'Creating idx_marketplaces_organization_id on marketplaces (organization_id)',
      );
      await queryRunner.query(
        `CREATE INDEX "idx_marketplaces_organization_id" ON "marketplaces" ("organization_id")`,
      );

      this.logger.debug(
        'Creating unique partial index uq_marketplaces_org_gitrepo_active on marketplaces (organization_id, git_repo_id) WHERE deleted_at IS NULL',
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "uq_marketplaces_org_gitrepo_active" ON "marketplaces" ("organization_id", "git_repo_id") WHERE "deleted_at" IS NULL`,
      );

      this.logger.info(
        'Migration AddMarketplacesTableAndGitRepoType completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMarketplacesTableAndGitRepoType failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMarketplacesTableAndGitRepoType');

    try {
      // Reverse order — drop marketplaces table (drops its indexes automatically),
      // then drop the type column from git_repos.
      this.logger.debug(
        'Dropping unique partial index uq_marketplaces_org_gitrepo_active',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "uq_marketplaces_org_gitrepo_active"`,
      );

      this.logger.debug('Dropping idx_marketplaces_organization_id index');
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_marketplaces_organization_id"`,
      );

      this.logger.debug('Dropping foreign key marketplaces -> users');
      await queryRunner.dropForeignKey('marketplaces', this.addedByForeignKey);

      this.logger.debug('Dropping foreign key marketplaces -> git_repos');
      await queryRunner.dropForeignKey('marketplaces', this.gitRepoForeignKey);

      this.logger.debug('Dropping foreign key marketplaces -> organizations');
      await queryRunner.dropForeignKey(
        'marketplaces',
        this.organizationForeignKey,
      );

      this.logger.debug('Dropping marketplaces table');
      await queryRunner.dropTable('marketplaces', true);

      this.logger.debug('Dropping `type` column from git_repos table');
      await queryRunner.query(`ALTER TABLE "git_repos" DROP COLUMN "type"`);

      this.logger.info(
        'Rollback AddMarketplacesTableAndGitRepoType completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddMarketplacesTableAndGitRepoType failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
