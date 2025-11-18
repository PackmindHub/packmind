import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export class CreateRagLabConfigurations1763501461640
  implements MigrationInterface
{
  private readonly logger = new PackmindLogger(
    'CreateRagLabConfigurations1763501461640',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: Create rag_lab_configurations table');

    try {
      this.logger.debug('Creating rag_lab_configurations table');
      await queryRunner.query(`
        CREATE TABLE "rag_lab_configurations" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "embedding_model" VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
          "embedding_dimensions" INTEGER NOT NULL DEFAULT 1536,
          "include_code_blocks" BOOLEAN NOT NULL DEFAULT false,
          "max_text_length" INTEGER NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "fk_rag_lab_configurations_organization"
            FOREIGN KEY ("organization_id")
            REFERENCES "organizations"("id")
            ON DELETE CASCADE,
          CONSTRAINT "uq_rag_lab_configurations_organization"
            UNIQUE ("organization_id")
        )
      `);

      this.logger.debug('Creating index on organization_id');
      await queryRunner.query(`
        CREATE INDEX "idx_rag_lab_configurations_organization_id"
        ON "rag_lab_configurations"("organization_id")
      `);

      this.logger.info(
        'Migration CreateRagLabConfigurations completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration CreateRagLabConfigurations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: Create rag_lab_configurations table');

    try {
      this.logger.debug('Dropping rag_lab_configurations table');
      await queryRunner.query(`
        DROP TABLE IF EXISTS "rag_lab_configurations"
      `);

      this.logger.info(
        'Rollback CreateRagLabConfigurations completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback CreateRagLabConfigurations failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
