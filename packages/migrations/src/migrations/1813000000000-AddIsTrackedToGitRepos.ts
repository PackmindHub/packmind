import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddIsTrackedToGitRepos1813000000000';

/**
 * Adds the `is_tracked` boolean column to the `git_repos` table.
 *
 * The column drives the single-tracked-branch feature exposed through the CLI
 * (`packmind track` / `packmind init`). It defaults to `false`; the
 * single-tracked-branch invariant is enforced in the use case layer, not at
 * the schema level.
 *
 * The `down` method drops the column, fully reversing the change.
 */
export class AddIsTrackedToGitRepos1813000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddIsTrackedToGitRepos');

    try {
      this.logger.debug('Adding git_repos.is_tracked column');
      await queryRunner.query(`
        ALTER TABLE "git_repos"
        ADD COLUMN "is_tracked" boolean NOT NULL DEFAULT false
      `);

      this.logger.info('Migration AddIsTrackedToGitRepos completed');
    } catch (error) {
      this.logger.error('Migration AddIsTrackedToGitRepos failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddIsTrackedToGitRepos');

    try {
      this.logger.debug('Dropping git_repos.is_tracked column');
      await queryRunner.query(`
        ALTER TABLE "git_repos"
        DROP COLUMN "is_tracked"
      `);

      this.logger.info('Rollback AddIsTrackedToGitRepos completed');
    } catch (error) {
      this.logger.error('Rollback AddIsTrackedToGitRepos failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
