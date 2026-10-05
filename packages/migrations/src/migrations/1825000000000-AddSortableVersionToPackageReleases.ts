import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddSortableVersionToPackageReleases1825000000000';

const TABLE = 'package_releases';
const INDEX = 'idx_package_releases_latest';

// The regex of D-009, restated here rather than imported: a migration is a
// snapshot of what the schema was asked to become, and must keep producing the
// same rows after the application's own parser has moved on.
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Stores each release's version as three sortable integers beside the string,
 * and indexes them with the package.
 *
 * `findLatestByPackageIds` backs the space-wide drift read, which asks for the
 * newest release of every package a destination pins. It could not ask the
 * database for it: `version` is a varchar, under which `0.10.0` sorts below
 * `0.9.0`, so the only correct answer was to select every release of every
 * named package and pick the highest by parsed triple in memory. A package with
 * a long release history paid for its whole history on every drift read.
 *
 * With the triple stored, `DISTINCT ON (package_id)` over this index reads one
 * row per package whatever the history behind it.
 *
 * Nullable, and the backfill skips what the pattern refuses. A version that
 * does not parse has no triple, and it is the same row the in-memory pick
 * dropped — storing a 0.0.0 for it would make an unparseable version the newest
 * release of a package that has none.
 */
export class AddSortableVersionToPackageReleases1825000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly columns = [
    new TableColumn({ name: 'version_major', type: 'int', isNullable: true }),
    new TableColumn({ name: 'version_minor', type: 'int', isNullable: true }),
    new TableColumn({ name: 'version_patch', type: 'int', isNullable: true }),
  ];

  private readonly index = new TableIndex({
    name: INDEX,
    columnNames: [
      'package_id',
      'version_major',
      'version_minor',
      'version_patch',
    ],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSortableVersionToPackageReleases');

    try {
      await queryRunner.addColumns(TABLE, this.columns);
      const backfilled = await this.backfill(queryRunner);
      await queryRunner.createIndex(TABLE, this.index);

      this.logger.info(
        'Migration AddSortableVersionToPackageReleases completed successfully',
        { backfilledVersions: backfilled },
      );
    } catch (error) {
      this.logger.error(
        'Migration AddSortableVersionToPackageReleases failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSortableVersionToPackageReleases');

    try {
      await queryRunner.dropIndex(TABLE, this.index);
      await queryRunner.dropColumns(TABLE, this.columns);

      this.logger.info(
        'Rollback AddSortableVersionToPackageReleases completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSortableVersionToPackageReleases failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Splits the version strings already in the table, one statement per distinct
   * version rather than per row.
   *
   * Parsed here rather than by `split_part(...)::int` with a regex guard,
   * because the two would have to agree on what a well-formed version is and
   * only one of them is this file.
   */
  private async backfill(queryRunner: QueryRunner): Promise<number> {
    const rows = (await queryRunner.query(
      `SELECT DISTINCT "version" FROM "${TABLE}"`,
    )) as { version: string }[];

    let backfilled = 0;
    for (const { version } of rows) {
      const match = VERSION_PATTERN.exec(version);
      if (!match) continue;

      await queryRunner.query(
        `UPDATE "${TABLE}"
         SET "version_major" = $1, "version_minor" = $2, "version_patch" = $3
         WHERE "version" = $4`,
        [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          version,
        ],
      );
      backfilled += 1;
    }

    return backfilled;
  }
}
