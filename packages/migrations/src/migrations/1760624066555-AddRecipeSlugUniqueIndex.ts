import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddRecipeSlugUniqueIndex1760624066555';

export class AddRecipeSlugUniqueIndex1760624066555 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRecipeSlugUniqueIndex');

    try {
      // Drop the old unique index on slug only if it exists
      this.logger.debug('Dropping old unique index idx_recipe_slug if exists');
      await queryRunner.query('DROP INDEX IF EXISTS idx_recipe_slug;');

      // Create unique partial index on (slug, organization_id) where not soft-deleted
      this.logger.debug(
        'Creating unique partial index idx_recipe_slug on (slug, organization_id) WHERE deleted_at IS NULL',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX idx_recipe_slug ON recipes (slug, organization_id) WHERE deleted_at IS NULL;',
      );

      this.logger.info(
        'Migration AddRecipeSlugUniqueIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddRecipeSlugUniqueIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRecipeSlugUniqueIndex');

    try {
      // Drop the partial unique index
      this.logger.debug('Dropping partial unique index idx_recipe_slug');
      await queryRunner.query('DROP INDEX IF EXISTS idx_recipe_slug;');

      // Recreate the old index on slug only
      this.logger.debug('Recreating old unique index on slug only');
      await queryRunner.query(
        'CREATE UNIQUE INDEX idx_recipe_slug ON recipes (slug) WHERE deleted_at IS NULL;',
      );

      this.logger.info(
        'Rollback AddRecipeSlugUniqueIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddRecipeSlugUniqueIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
