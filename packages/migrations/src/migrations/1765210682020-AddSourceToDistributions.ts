import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddSourceToDistributions1765210682020';

export class AddSourceToDistributions1765210682020
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSourceToDistributions');

    try {
      await queryRunner.query(`
        ALTER TABLE "distributions"
        ADD COLUMN "source" varchar NOT NULL DEFAULT 'app'
      `);

      this.logger.info(
        'Migration AddSourceToDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddSourceToDistributions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSourceToDistributions');

    try {
      await queryRunner.query(`
        ALTER TABLE "distributions"
        DROP COLUMN "source"
      `);

      this.logger.info(
        'Rollback AddSourceToDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSourceToDistributions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
