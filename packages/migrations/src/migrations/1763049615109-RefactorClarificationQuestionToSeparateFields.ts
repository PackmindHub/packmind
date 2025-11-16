import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'RefactorClarificationQuestionToSeparateFields1763049615109';

export class RefactorClarificationQuestionToSeparateFields1763049615109
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: RefactorClarificationQuestionToSeparateFields',
    );

    try {
      this.logger.info(
        'Dropping old clarification_question column from rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        DROP COLUMN IF EXISTS "clarification_question"
      `);
      this.logger.info(
        'Successfully dropped old clarification_question column',
      );

      this.logger.info(
        'Adding new clarification_question and clarification_answers columns to rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        ADD COLUMN "clarification_question" text NULL,
        ADD COLUMN "clarification_answers" text NULL
      `);
      this.logger.info(
        'Successfully added new clarification_question and clarification_answers columns',
      );

      this.logger.info(
        'Migration RefactorClarificationQuestionToSeparateFields completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration RefactorClarificationQuestionToSeparateFields failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: RefactorClarificationQuestionToSeparateFields',
    );

    try {
      this.logger.info(
        'Dropping new clarification_question and clarification_answers columns from rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        DROP COLUMN "clarification_question",
        DROP COLUMN "clarification_answers"
      `);
      this.logger.info('Successfully dropped new columns');

      this.logger.info(
        'Restoring old clarification_question column to rule_detection_assessments table',
      );
      await queryRunner.query(`
        ALTER TABLE "rule_detection_assessments" 
        ADD COLUMN "clarification_question" text NULL
      `);
      this.logger.info(
        'Successfully restored old clarification_question column',
      );

      this.logger.info(
        'Rollback RefactorClarificationQuestionToSeparateFields completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback RefactorClarificationQuestionToSeparateFields failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
