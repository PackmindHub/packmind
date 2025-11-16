import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export class AddEmbeddingToRecipeVersions1763330671750
  implements MigrationInterface
{
  private readonly logger = new PackmindLogger(
    'AddEmbeddingToRecipeVersions1763330671750',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: Add embedding to recipe_versions');

    try {
      this.logger.debug('Adding embedding column to recipe_versions table');
      await queryRunner.query(`
        ALTER TABLE "recipe_versions"
        ADD COLUMN "embedding" vector(1536) NULL
      `);

      this.logger.debug('Creating ivfflat index on embedding column');
      await queryRunner.query(`
        CREATE INDEX "idx_recipe_versions_embedding"
        ON "recipe_versions"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      this.logger.info(
        'Migration AddEmbeddingToRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddEmbeddingToRecipeVersions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: Add embedding to recipe_versions');

    try {
      this.logger.debug('Dropping ivfflat index on embedding column');
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_recipe_versions_embedding"
      `);

      this.logger.debug('Dropping embedding column from recipe_versions table');
      await queryRunner.query(`
        ALTER TABLE "recipe_versions"
        DROP COLUMN IF EXISTS "embedding"
      `);

      this.logger.info(
        'Rollback AddEmbeddingToRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddEmbeddingToRecipeVersions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
