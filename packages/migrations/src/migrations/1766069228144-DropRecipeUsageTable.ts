import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropRecipeUsageTable1766069228144';

/**
 * Drops the `recipe_usage` table, the analytics feature it backed having been
 * removed from the system.
 */
export class DropRecipeUsageTable1766069228144 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropRecipeUsageTable');

    try {
      this.logger.info('Dropping foreign key constraints on recipe_usage');
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "recipe_usage"
        DROP CONSTRAINT IF EXISTS "FK_recipe_usage_recipe"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "recipe_usage"
        DROP CONSTRAINT IF EXISTS "FK_recipe_usage_git_repo"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "recipe_usage"
        DROP CONSTRAINT IF EXISTS "FK_recipe_usage_target"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "recipe_usage"
        DROP CONSTRAINT IF EXISTS "FK_recipe_usage_user"
      `);

      this.logger.info('Dropping recipe_usage table');
      await queryRunner.query(`DROP TABLE IF EXISTS "recipe_usage"`);
      this.logger.info('Successfully dropped recipe_usage table');

      this.logger.info('Migration DropRecipeUsageTable completed successfully');
    } catch (error) {
      this.logger.error('Migration DropRecipeUsageTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(): Promise<void> {
    this.logger.error(
      'Cannot reverse drop of recipe_usage table - migration is irreversible',
    );
    throw new Error('Cannot reverse drop of recipe_usage table');
  }
}
