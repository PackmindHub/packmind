import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddVersionSpecToDistributedPackages1824000000000';

const TABLE = 'distributed_packages';
const COLUMN = 'version_spec';

/**
 * Records, on every distributed package, the `packmind.json` spec the
 * destination was left on: `*` for a repository tracking the live package, an
 * exact `X.Y.Z` for one pinned to a release.
 *
 * Until now the only place that knew was the repository's own `packmind.json`,
 * read from git at publish time. Drift is rendered for every destination of a
 * space at once, so measuring it against the pin would mean one git call per
 * destination — which is why drift measures distance from the live package
 * instead, and why a pinned repository sitting on the newest release there is
 * still reads as behind.
 *
 * Nullable, and deliberately not backfilled. `*` would be the right value for
 * every row written before pinning existed, but not for the ones written since,
 * and the two cannot be told apart from this table: the pin lives in a file on
 * a branch. So the column says only what it knows, null means "this row does
 * not record one", and the reader decides what to make of that — today, read it
 * as the live package, which is how every such destination already behaves.
 */
export class AddVersionSpecToDistributedPackages1824000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly column = new TableColumn({
    name: COLUMN,
    type: 'varchar',
    isNullable: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddVersionSpecToDistributedPackages');

    try {
      await queryRunner.addColumn(TABLE, this.column);

      this.logger.info(
        'Migration AddVersionSpecToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddVersionSpecToDistributedPackages failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddVersionSpecToDistributedPackages');

    try {
      await queryRunner.dropColumn(TABLE, this.column);

      this.logger.info(
        'Rollback AddVersionSpecToDistributedPackages completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddVersionSpecToDistributedPackages failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
