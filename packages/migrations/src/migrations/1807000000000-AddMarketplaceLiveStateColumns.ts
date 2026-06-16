import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddMarketplaceLiveStateColumns1807000000000';

export class AddMarketplaceLiveStateColumns1807000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMarketplaceLiveStateColumns');
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        ADD COLUMN "error_kind" varchar NULL,
        ADD COLUMN "error_detail" text NULL,
        ADD COLUMN "pending_pr_url" text NULL,
        ADD COLUMN "outdated_plugin_slugs" jsonb NULL
      `);
      this.logger.info('Added live-state columns to marketplaces');

      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        ADD COLUMN "version_fingerprint" jsonb NULL
      `);
      this.logger.info(
        'Added version_fingerprint column to marketplace_distributions',
      );

      this.logger.info(
        'Migration AddMarketplaceLiveStateColumns completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMarketplaceLiveStateColumns failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMarketplaceLiveStateColumns');
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        DROP COLUMN "version_fingerprint"
      `);
      await queryRunner.query(`
        ALTER TABLE "marketplaces"
        DROP COLUMN "outdated_plugin_slugs",
        DROP COLUMN "pending_pr_url",
        DROP COLUMN "error_detail",
        DROP COLUMN "error_kind"
      `);
      this.logger.info(
        'Rollback AddMarketplaceLiveStateColumns completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddMarketplaceLiveStateColumns failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
