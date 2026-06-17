import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreatePluginInstallationsAndTrackingToken1781624244359';

/**
 * No-op migration.
 *
 * This migration originally created the `plugin_installations` table and added
 * the `tracking_token` column to `marketplaces`. Its timestamp
 * (1781624244359) is earlier than `1804000000000-AddMarketplacesTableAndGitRepoType`,
 * which creates the `marketplaces` table this work depends on. In a clean
 * environment TypeORM runs migrations in timestamp order, so the original
 * failed because `marketplaces` did not exist yet. In existing environments it
 * had already run successfully (marketplaces was present at deploy time) and is
 * recorded in the migrations tracking table.
 *
 * The class name and timestamp are kept unchanged so environments that already
 * ran it still match the recorded entry and never re-run it. The actual schema
 * work has been re-homed, idempotently, into
 * `1810000000000-CreatePluginInstallationsAndTrackingToken`, which runs after
 * the marketplace migrations.
 */
export class CreatePluginInstallationsAndTrackingToken1781624244359 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Skipping CreatePluginInstallationsAndTrackingToken (1781624244359): no-op. ' +
        'The work was rescheduled to 1810000000000 to fix the migration ordering.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Skipping CreatePluginInstallationsAndTrackingToken (1781624244359) rollback: no-op. ' +
        'The schema is owned by migration 1810000000000.',
    );
  }
}
