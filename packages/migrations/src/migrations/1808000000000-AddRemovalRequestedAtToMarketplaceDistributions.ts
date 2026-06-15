import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddRemovalRequestedAtToMarketplaceDistributions1808000000000';

export class AddRemovalRequestedAtToMarketplaceDistributions1808000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddRemovalRequestedAtToMarketplaceDistributions',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        ADD COLUMN "removal_requested_at" timestamp with time zone NULL
      `);
      this.logger.info(
        'Added removal_requested_at column to marketplace_distributions',
      );

      this.logger.info(
        'Migration AddRemovalRequestedAtToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddRemovalRequestedAtToMarketplaceDistributions failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddRemovalRequestedAtToMarketplaceDistributions',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        DROP COLUMN "removal_requested_at"
      `);
      this.logger.info(
        'Rollback AddRemovalRequestedAtToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddRemovalRequestedAtToMarketplaceDistributions failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
