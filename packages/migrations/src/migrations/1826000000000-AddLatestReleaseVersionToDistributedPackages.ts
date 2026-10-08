import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddLatestReleaseVersionToDistributedPackages1826000000000';

const TABLE = 'distributed_packages';
const COLUMN = 'latest_release_version';

/**
 * Records, on every distributed package sent as `*`, the highest release the
 * package had at that moment, so a history can say which release the live
 * package it sent was built on.
 *
 * Nullable and not backfilled: rows written before it read as unreleased with
 * no base release.
 */
export class AddLatestReleaseVersionToDistributedPackages1826000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly column = new TableColumn({
    name: COLUMN,
    type: 'varchar',
    isNullable: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddLatestReleaseVersionToDistributedPackages',
    );

    try {
      await queryRunner.addColumn(TABLE, this.column);

      this.logger.info(
        'Migration AddLatestReleaseVersionToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddLatestReleaseVersionToDistributedPackages failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddLatestReleaseVersionToDistributedPackages',
    );

    try {
      await queryRunner.dropColumn(TABLE, this.column);

      this.logger.info(
        'Rollback AddLatestReleaseVersionToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddLatestReleaseVersionToDistributedPackages failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
