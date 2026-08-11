import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddTrackingRemovedAtToGitRepos1818000000000';

/**
 * Adds the `tracking_removed_at` column to `git_repos`, plus the partial index
 * supporting the "has tracking been removed for this repository?" lookup.
 *
 * The removed state gets its own column rather than reusing the existing
 * `deleted_at` soft-delete column on purpose. Repository resolution
 * (`GitRepoRepository.findByProviderId`, reached from
 * `FindOrCreateGitRepoUseCase`) excludes soft-deleted rows, so a soft-deleted
 * row would be invisible to re-tracking: it would create a second row for the
 * same (owner, repo, branch) and orphan the original along with all of its
 * distribution history. A dedicated nullable column leaves the row visible to
 * that lookup, which is what makes removal reversible.
 *
 * `NULL` means tracking was never removed, or has since been restored.
 *
 * The index mirrors `idx_git_repos_tracked_owner_repo`, which is partial on
 * `is_tracked = true`. Both are needed: the governance predicate now matches a
 * governing sibling branch on `is_tracked = true OR tracking_removed_at IS NOT
 * NULL`, and neither partial index covers both arms of that disjunction alone.
 *
 * The `down` method drops both, fully reversing the change.
 */
export class AddTrackingRemovedAtToGitRepos1818000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddTrackingRemovedAtToGitRepos');

    try {
      this.logger.debug('Adding git_repos.tracking_removed_at column');
      await queryRunner.query(`
        ALTER TABLE "git_repos"
        ADD COLUMN "tracking_removed_at" timestamp with time zone
      `);

      this.logger.debug(
        'Creating idx_git_repos_tracking_removed_owner_repo index',
      );
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_git_repos_tracking_removed_owner_repo"
        ON "git_repos" ("owner", "repo")
        WHERE "tracking_removed_at" IS NOT NULL AND "deleted_at" IS NULL
      `);

      this.logger.info('Migration AddTrackingRemovedAtToGitRepos completed');
    } catch (error) {
      this.logger.error('Migration AddTrackingRemovedAtToGitRepos failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddTrackingRemovedAtToGitRepos');

    try {
      this.logger.debug(
        'Dropping idx_git_repos_tracking_removed_owner_repo index',
      );
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_git_repos_tracking_removed_owner_repo"
      `);

      this.logger.debug('Dropping git_repos.tracking_removed_at column');
      await queryRunner.query(`
        ALTER TABLE "git_repos"
        DROP COLUMN "tracking_removed_at"
      `);

      this.logger.info('Rollback AddTrackingRemovedAtToGitRepos completed');
    } catch (error) {
      this.logger.error('Rollback AddTrackingRemovedAtToGitRepos failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
