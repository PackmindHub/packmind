import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddInProgressStatusToRuleDetectionAssessments1763117634417';

export class AddInProgressStatusToRuleDetectionAssessments1763117634417 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddInProgressStatusToRuleDetectionAssessments',
    );

    try {
      this.logger.info(
        'Adding IN_PROGRESS value to rule_detection_assessments status enum',
      );
      await queryRunner.query(`
        ALTER TYPE rule_detection_assessments_status_enum ADD VALUE 'IN_PROGRESS'
      `);
      this.logger.info(
        'Successfully added IN_PROGRESS value to rule_detection_assessments status enum',
      );

      this.logger.info(
        'Migration AddInProgressStatusToRuleDetectionAssessments completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddInProgressStatusToRuleDetectionAssessments failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddInProgressStatusToRuleDetectionAssessments',
    );

    try {
      this.logger.info(
        'Removing IN_PROGRESS value from rule_detection_assessments status enum',
      );

      // PostgreSQL cannot drop a value from an enum type, so the column detours
      // through varchar while the type is recreated without IN_PROGRESS.
      await queryRunner.query(`
        ALTER TABLE rule_detection_assessments
        ALTER COLUMN status TYPE varchar USING status::varchar
      `);

      await queryRunner.query(`
        DROP TYPE rule_detection_assessments_status_enum
      `);

      await queryRunner.query(`
        CREATE TYPE rule_detection_assessments_status_enum AS ENUM ('NOT_STARTED', 'SUCCEEDED', 'FAILED')
      `);

      await queryRunner.query(`
        ALTER TABLE rule_detection_assessments
        ALTER COLUMN status TYPE rule_detection_assessments_status_enum USING status::rule_detection_assessments_status_enum
      `);

      this.logger.info(
        'Successfully removed IN_PROGRESS value from rule_detection_assessments status enum',
      );

      this.logger.info(
        'Rollback AddInProgressStatusToRuleDetectionAssessments completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddInProgressStatusToRuleDetectionAssessments failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
