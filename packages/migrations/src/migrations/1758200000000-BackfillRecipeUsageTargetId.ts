import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'BackfillRecipeUsageTargetId1758200000000';

/**
 * Backfill recipe_usage.target_id for existing rows using the default target of the associated git repo.
 *
 * Rules:
 * - Only update rows where recipe_usage.target_id IS NULL
 * - Use the "Default" target (name='Default', path='/') attached to the same git_repo_id
 * - Do nothing for rows where git_repo_id IS NULL or no default target exists
 */
export class BackfillRecipeUsageTargetId1758200000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: BackfillRecipeUsageTargetId');

    try {
      // Preview how many rows will be updated
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

      // Perform the backfill using a single UPDATE ... FROM statement
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
      // Revert only the rows that were set by this migration (i.e., set to the default target of their repo)
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
