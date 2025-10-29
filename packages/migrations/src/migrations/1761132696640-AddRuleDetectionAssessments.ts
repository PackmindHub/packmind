import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/shared/src/database/migrationColumns';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddRuleDetectionAssessments1761132696640';

export class AddRuleDetectionAssessments1761132696640
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly ruleDetectionAssessmentsTable = new Table({
    name: 'rule_detection_assessments',
    columns: [
      uuidMigrationColumn,
      {
        name: 'rule_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'language',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'detection_mode',
        type: 'enum',
        enum: ['regexp', 'singleAst', 'fileSystem'],
        isNullable: false,
      },
      {
        name: 'status',
        type: 'enum',
        enum: ['NOT_STARTED', 'SUCCEEDED', 'FAILED'],
        isNullable: false,
      },
      {
        name: 'details',
        type: 'text',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly ruleDetectionAssessmentsRuleForeignKey = new TableForeignKey(
    {
      columnNames: ['rule_id'],
      referencedTableName: 'rules',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_rule_detection_assessments_rule',
    },
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRuleDetectionAssessments');

    try {
      this.logger.info('Creating rule_detection_assessments table');
      await queryRunner.createTable(this.ruleDetectionAssessmentsTable);
      this.logger.info('Successfully created rule_detection_assessments table');

      this.logger.info(
        'Adding foreign key constraint for rule_detection_assessments table',
      );
      await queryRunner.createForeignKey(
        'rule_detection_assessments',
        this.ruleDetectionAssessmentsRuleForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for rule_detection_assessments table',
      );

      this.logger.info(
        'Migration AddRuleDetectionAssessments completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddRuleDetectionAssessments failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRuleDetectionAssessments');

    try {
      this.logger.info(
        'Dropping foreign key constraint for rule_detection_assessments table',
      );
      await queryRunner.dropForeignKey(
        'rule_detection_assessments',
        this.ruleDetectionAssessmentsRuleForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for rule_detection_assessments table',
      );

      this.logger.info('Dropping rule_detection_assessments table');
      await queryRunner.dropTable('rule_detection_assessments', true);
      this.logger.info('Successfully dropped rule_detection_assessments table');

      this.logger.info(
        'Rollback AddRuleDetectionAssessments completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddRuleDetectionAssessments failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
