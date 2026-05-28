import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddMetadataToDistributions1780000000000';

export class AddMetadataToDistributions1780000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMetadataToDistributions');

    try {
      await queryRunner.query(
        `ALTER TABLE "distributions" ADD COLUMN "metadata" jsonb`,
      );

      this.logger.info(
        'Migration AddMetadataToDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMetadataToDistributions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMetadataToDistributions');

    try {
      await queryRunner.query(
        `ALTER TABLE "distributions" DROP COLUMN "metadata"`,
      );

      this.logger.info(
        'Rollback AddMetadataToDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddMetadataToDistributions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
