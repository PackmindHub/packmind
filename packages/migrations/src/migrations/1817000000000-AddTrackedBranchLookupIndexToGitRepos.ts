import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddTrackedBranchLookupIndexToGitRepos1817000000000';

/**
 * Adds a partial index supporting the "is a sibling branch of this repository
 * currently tracked?" lookup that scopes distribution history to the tracked
 * branch.
 *
 * The index is partial on `is_tracked = true AND deleted_at IS NULL`, so it
 * holds at most one row per tracked repository and stays small no matter how
 * many branches accumulate history over time.
 *
 * The `down` method drops the index, fully reversing the change.
 */
export class AddTrackedBranchLookupIndexToGitRepos1817000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddTrackedBranchLookupIndexToGitRepos',
    );

    try {
      this.logger.debug('Creating idx_git_repos_tracked_owner_repo index');
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_git_repos_tracked_owner_repo"
        ON "git_repos" ("owner", "repo")
        WHERE "is_tracked" = true AND "deleted_at" IS NULL
      `);

      this.logger.info(
        'Migration AddTrackedBranchLookupIndexToGitRepos completed',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddTrackedBranchLookupIndexToGitRepos failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddTrackedBranchLookupIndexToGitRepos',
    );

    try {
      this.logger.debug('Dropping idx_git_repos_tracked_owner_repo index');
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_git_repos_tracked_owner_repo"
      `);

      this.logger.info(
        'Rollback AddTrackedBranchLookupIndexToGitRepos completed',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddTrackedBranchLookupIndexToGitRepos failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
