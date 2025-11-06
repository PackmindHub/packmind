import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
  softDeleteMigrationColumns,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddRuleExamples1756356799389';

export class AddRuleExamples1756356799389 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definition
  private readonly ruleExamplesTable = new Table({
    name: 'rule_examples',
    columns: [
      uuidMigrationColumn,
      {
        name: 'lang',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'positive',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'negative',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'rule_id',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  // Foreign key definition
  private readonly ruleExamplesRuleForeignKey = new TableForeignKey({
    columnNames: ['rule_id'],
    referencedTableName: 'rules',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_rule_examples_rule',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRuleExamples');

    try {
      // Create rule_examples table
      this.logger.debug('Creating rule_examples table');
      await queryRunner.createTable(this.ruleExamplesTable);
      this.logger.info('Successfully created rule_examples table');

      // Create indices
      this.logger.debug('Creating indices for rule_examples table');
      await queryRunner.createIndex(
        'rule_examples',
        new TableIndex({
          name: 'idx_rule_example_rule',
          columnNames: ['rule_id'],
        }),
      );
      await queryRunner.createIndex(
        'rule_examples',
        new TableIndex({
          name: 'idx_rule_example_lang',
          columnNames: ['lang'],
        }),
      );
      this.logger.info('Successfully created indices for rule_examples table');

      // Create foreign key
      this.logger.debug(
        'Adding foreign key constraint for rule_examples table',
      );
      await queryRunner.createForeignKey(
        'rule_examples',
        this.ruleExamplesRuleForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for rule_examples table',
      );

      this.logger.info('Migration AddRuleExamples completed successfully');
    } catch (error) {
      this.logger.error('Migration AddRuleExamples failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRuleExamples');

    try {
      // Drop foreign key
      this.logger.debug(
        'Dropping foreign key constraint for rule_examples table',
      );
      await queryRunner.dropForeignKey(
        'rule_examples',
        this.ruleExamplesRuleForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for rule_examples table',
      );

      // Drop indices
      this.logger.debug('Dropping indices for rule_examples table');
      await queryRunner.dropIndex('rule_examples', 'idx_rule_example_lang');
      await queryRunner.dropIndex('rule_examples', 'idx_rule_example_rule');
      this.logger.info('Successfully dropped indices for rule_examples table');

      // Drop table
      this.logger.debug('Dropping rule_examples table');
      await queryRunner.dropTable('rule_examples', true);
      this.logger.info('Successfully dropped rule_examples table');

      this.logger.info('Rollback AddRuleExamples completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddRuleExamples failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
