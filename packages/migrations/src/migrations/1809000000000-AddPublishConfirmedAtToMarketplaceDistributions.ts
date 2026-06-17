import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddPublishConfirmedAtToMarketplaceDistributions1809000000000';

/**
 * Migration: AddPublishConfirmedAtToMarketplaceDistributions
 *
 * Companion to the introduction of the `pending_merge` DistributionStatus:
 * a publish now lands in `pending_merge` when its commit reaches the rolling
 * sync branch, and only becomes `success` once the reconciliation sweep
 * confirms the change merged onto the marketplace's default branch (matched
 * via the `packmind-lock.json` content hash).
 *
 * The `status` column is a `varchar` (see
 * `1805000000000-AddMarketplaceDistributionsTable`), so the new value needs
 * no DDL — this migration documents it, following the precedent of
 * `1806000000000-DocumentMarketplaceDistributionLifecycleStates`.
 *
 * The DDL part adds `publish_confirmed_at`, stamped by reconciliation at the
 * `pending_merge → success` transition. Existing `success` rows predate the
 * confirmation step, so they are backfilled with `updated_at` (the moment
 * the publish job last touched them) as the best available approximation.
 */
export class AddPublishConfirmedAtToMarketplaceDistributions1809000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddPublishConfirmedAtToMarketplaceDistributions',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        ADD COLUMN "publish_confirmed_at" timestamp with time zone NULL
      `);
      this.logger.info(
        'Added publish_confirmed_at column to marketplace_distributions',
      );

      await queryRunner.query(`
        UPDATE "marketplace_distributions"
        SET "publish_confirmed_at" = "updated_at"
        WHERE "status" = 'success'
      `);
      this.logger.info(
        'Backfilled publish_confirmed_at from updated_at for existing success rows',
      );

      this.logger.info(
        'Introducing new DistributionStatus value for marketplace_distributions.status: "pending_merge". No DDL change required — the column is a varchar.',
      );

      this.logger.info(
        'Migration AddPublishConfirmedAtToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddPublishConfirmedAtToMarketplaceDistributions failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddPublishConfirmedAtToMarketplaceDistributions',
    );
    try {
      // Pre-pending_merge code treated "landed on the sync branch" as
      // published, so reverting pending rows to `success` restores the exact
      // semantics that code expects.
      await queryRunner.query(`
        UPDATE "marketplace_distributions"
        SET "status" = 'success'
        WHERE "status" = 'pending_merge'
      `);
      this.logger.info(
        'Reverted pending_merge marketplace distributions to success',
      );

      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        DROP COLUMN "publish_confirmed_at"
      `);
      this.logger.info(
        'Rollback AddPublishConfirmedAtToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddPublishConfirmedAtToMarketplaceDistributions failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
