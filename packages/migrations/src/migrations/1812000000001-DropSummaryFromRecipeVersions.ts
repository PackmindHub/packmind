import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropSummaryFromRecipeVersions1812000000001';

export class DropSummaryFromRecipeVersions1812000000001 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropSummaryFromRecipeVersions');

    try {
      await queryRunner.query(`
        ALTER TABLE "recipe_versions" DROP COLUMN IF EXISTS "summary"
      `);
      this.logger.info(
        'Migration DropSummaryFromRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropSummaryFromRecipeVersions failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropSummaryFromRecipeVersions');

    try {
      await queryRunner.query(`
        ALTER TABLE "recipe_versions" ADD COLUMN "summary" text NULL
      `);
      this.logger.info(
        'Rollback DropSummaryFromRecipeVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropSummaryFromRecipeVersions failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
