import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddClarificationQuestionToRuleDetectionAssessment1763047903152';

export class AddClarificationQuestionToRuleDetectionAssessment1763047903152
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddClarificationQuestionToRuleDetectionAssessment',
    );

    try {
      this.logger.info(
        'Adding clarification_question column to rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        ADD COLUMN "clarification_question" text NULL
      `);
      this.logger.info(
        'Successfully added clarification_question column to rule_detection_assessments table',
      );

      this.logger.info(
        'Migration AddClarificationQuestionToRuleDetectionAssessment completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddClarificationQuestionToRuleDetectionAssessment failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddClarificationQuestionToRuleDetectionAssessment',
    );

    try {
      this.logger.info(
        'Dropping clarification_question column from rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        DROP COLUMN "clarification_question"
      `);
      this.logger.info(
        'Successfully dropped clarification_question column from rule_detection_assessments table',
      );

      this.logger.info(
        'Rollback AddClarificationQuestionToRuleDetectionAssessment completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddClarificationQuestionToRuleDetectionAssessment failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
