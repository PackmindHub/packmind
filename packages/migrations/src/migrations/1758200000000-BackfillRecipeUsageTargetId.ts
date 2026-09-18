import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'BackfillRecipeUsageTargetId1758200000000';

/**
 * Backfills `recipe_usage.target_id` from the default target of the row's git
 * repo. The default target is matched on `name = 'Default'` and `path = '/'`,
 * so rows whose repo has no such target are left alone.
 */
export class BackfillRecipeUsageTargetId1758200000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: BackfillRecipeUsageTargetId');

    try {
      const [{ count }] = await queryRunner.query(`
        SELECT COUNT(*)::int AS count
        FROM recipe_usage ru
        WHERE ru.target_id IS NULL
          AND ru.git_repo_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM targets t
            WHERE t.git_repo_id = ru.git_repo_id
              AND t.name = 'Default'
              AND t.path = '/'
          )
      `);

      if (Number(count) === 0) {
        this.logger.info('No recipe_usage rows require backfilling.');
        return;
      }

      this.logger.info(`Backfilling target_id for ${count} recipe_usage rows`);

      await queryRunner.query(`
        UPDATE recipe_usage ru
        SET target_id = t.id
        FROM targets t
        WHERE ru.target_id IS NULL
          AND ru.git_repo_id IS NOT NULL
          AND t.git_repo_id = ru.git_repo_id
          AND t.name = 'Default'
          AND t.path = '/'
      `);

      this.logger.info('Successfully backfilled recipe_usage.target_id');
    } catch (error) {
      this.logger.error('Migration BackfillRecipeUsageTargetId failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: BackfillRecipeUsageTargetId');

    try {
      // Clears only rows pointing at a default target; a row moved to some other
      // target since the backfill is left alone.
      await queryRunner.query(`
        UPDATE recipe_usage ru
        SET target_id = NULL
        WHERE ru.target_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM targets t
            WHERE t.id = ru.target_id
              AND t.name = 'Default'
              AND t.path = '/'
          )
      `);

      this.logger.info(
        'Rollback BackfillRecipeUsageTargetId completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback BackfillRecipeUsageTargetId failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
