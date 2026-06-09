import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DocumentMarketplaceDistributionLifecycleStates1806000000000';

/**
 * Migration: DocumentMarketplaceDistributionLifecycleStates
 *
 * No-op migration that documents the introduction of two new
 * `DistributionStatus` values for marketplace distributions:
 *
 *   - `to_be_removed`: a successful distribution that has been flagged for
 *     retirement. The plugin still exists on the marketplace until a CLI
 *     deletion is followed by a reconciliation cycle that confirms the slug
 *     is gone from the descriptor.
 *   - `removed`: terminal state set by reconciliation once a flagged
 *     distribution's plugin slug is no longer present in the marketplace
 *     descriptor.
 *
 * The `status` column on `marketplace_distributions` is a `varchar` (see
 * `1805000000000-AddMarketplaceDistributionsTable`), so no DDL change is
 * required to accept the new values. This migration exists purely to leave
 * an auditable trail in the migration history alongside the code change
 * that introduces these lifecycle states.
 */
export class DocumentMarketplaceDistributionLifecycleStates1806000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: DocumentMarketplaceDistributionLifecycleStates',
    );

    this.logger.info(
      'Introducing new DistributionStatus values for marketplace_distributions.status: "to_be_removed" and "removed". No DDL change required — the column is a varchar.',
    );

    this.logger.info(
      'Migration DocumentMarketplaceDistributionLifecycleStates completed successfully',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: DocumentMarketplaceDistributionLifecycleStates',
    );

    this.logger.info(
      'Reverting introduction of DistributionStatus values "to_be_removed" and "removed". No DDL change to revert — application code no longer emits these statuses after rollback.',
    );

    this.logger.info(
      'Rollback DocumentMarketplaceDistributionLifecycleStates completed successfully',
    );
  }
}
