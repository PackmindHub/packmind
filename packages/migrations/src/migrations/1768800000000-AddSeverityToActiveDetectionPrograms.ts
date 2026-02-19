import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddSeverityToActiveDetectionPrograms1768800000000';

export class AddSeverityToActiveDetectionPrograms1768800000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddSeverityToActiveDetectionPrograms',
    );

    try {
      this.logger.info(
        'Adding severity column to active_detection_programs table',
      );

      await queryRunner.query(`
        ALTER TABLE "active_detection_programs"
        ADD COLUMN "severity" varchar NOT NULL DEFAULT 'error'
      `);

      this.logger.info('Successfully added severity column');
      this.logger.info(
        'Migration AddSeverityToActiveDetectionPrograms completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddSeverityToActiveDetectionPrograms failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSeverityToActiveDetectionPrograms');

    try {
      this.logger.info(
        'Dropping severity column from active_detection_programs table',
      );

      await queryRunner.query(`
        ALTER TABLE "active_detection_programs"
        DROP COLUMN "severity"
      `);

      this.logger.info(
        'Rollback AddSeverityToActiveDetectionPrograms completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddSeverityToActiveDetectionPrograms failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
