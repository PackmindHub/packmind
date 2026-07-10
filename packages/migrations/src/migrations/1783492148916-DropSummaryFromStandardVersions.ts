import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropSummaryFromStandardVersions1783492148916';

export class DropSummaryFromStandardVersions1783492148916 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropSummaryFromStandardVersions');

    try {
      await queryRunner.query(`
        ALTER TABLE "standard_versions" DROP COLUMN IF EXISTS "summary"
      `);
      this.logger.info(
        'Migration DropSummaryFromStandardVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropSummaryFromStandardVersions failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropSummaryFromStandardVersions');

    try {
      await queryRunner.query(`
        ALTER TABLE "standard_versions" ADD COLUMN "summary" text NULL
      `);
      this.logger.info(
        'Rollback DropSummaryFromStandardVersions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropSummaryFromStandardVersions failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
