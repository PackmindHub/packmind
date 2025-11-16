import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export class AddEmbeddingToStandardVersions1763330645537
  implements MigrationInterface
{
  private readonly logger = new PackmindLogger(
    'AddEmbeddingToStandardVersions1763330645537',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: Add embedding to standard_versions');

    try {
      this.logger.debug('Adding embedding column to standard_versions table');
      await queryRunner.query(`
        ALTER TABLE "standard_versions"
        ADD COLUMN "embedding" vector(1536) NULL
      `);

      this.logger.debug('Creating ivfflat index on embedding column');
      await queryRunner.query(`
        CREATE INDEX "idx_standard_versions_embedding"
        ON "standard_versions"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      this.logger.info(
        'Migration AddEmbeddingToStandardVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddEmbeddingToStandardVersions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: Add embedding to standard_versions');

    try {
      this.logger.debug('Dropping ivfflat index on embedding column');
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_standard_versions_embedding"
      `);

      this.logger.debug(
        'Dropping embedding column from standard_versions table',
      );
      await queryRunner.query(`
        ALTER TABLE "standard_versions"
        DROP COLUMN IF EXISTS "embedding"
      `);

      this.logger.info(
        'Rollback AddEmbeddingToStandardVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddEmbeddingToStandardVersions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
