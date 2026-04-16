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

const origin = 'AddDetectionHeuristics1763051448216';

export class AddDetectionHeuristics1763051448216 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definition
  private readonly detectionHeuristicsTable = new Table({
    name: 'detection_heuristics',
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
        name: 'heuristics',
        type: 'text[]',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  // Index definitions
  private readonly ruleIdIndex = new TableIndex({
    name: 'idx_detection_heuristics_rule_id',
    columnNames: ['rule_id'],
  });

  private readonly uniqueRuleLanguageIndex = new TableIndex({
    name: 'uq_detection_heuristics_rule_language',
    columnNames: ['rule_id', 'language'],
    isUnique: true,
    where: 'deleted_at IS NULL',
  });

  // Foreign key definition
  private readonly detectionHeuristicsRuleForeignKey = new TableForeignKey({
    columnNames: ['rule_id'],
    referencedTableName: 'rules',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_detection_heuristics_rule',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDetectionHeuristics');

    try {
      // Create detection_heuristics table
      this.logger.info('Creating detection_heuristics table');
      await queryRunner.createTable(this.detectionHeuristicsTable);
      this.logger.info('Successfully created detection_heuristics table');

      // Create indices
      this.logger.info('Creating indices for detection_heuristics table');
      await queryRunner.createIndex('detection_heuristics', this.ruleIdIndex);
      await queryRunner.createIndex(
        'detection_heuristics',
        this.uniqueRuleLanguageIndex,
      );
      this.logger.info(
        'Successfully created indices for detection_heuristics table',
      );

      // Create foreign key
      this.logger.info(
        'Adding foreign key constraint for detection_heuristics table',
      );
      await queryRunner.createForeignKey(
        'detection_heuristics',
        this.detectionHeuristicsRuleForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for detection_heuristics table',
      );

      this.logger.info(
        'Migration AddDetectionHeuristics completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddDetectionHeuristics failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDetectionHeuristics');

    try {
      // Drop foreign key
      this.logger.info(
        'Dropping foreign key constraint for detection_heuristics table',
      );
      await queryRunner.dropForeignKey(
        'detection_heuristics',
        this.detectionHeuristicsRuleForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for detection_heuristics table',
      );

      // Drop indices
      this.logger.info('Dropping indices for detection_heuristics table');
      await queryRunner.dropIndex(
        'detection_heuristics',
        'uq_detection_heuristics_rule_language',
      );
      await queryRunner.dropIndex(
        'detection_heuristics',
        'idx_detection_heuristics_rule_id',
      );
      this.logger.info(
        'Successfully dropped indices for detection_heuristics table',
      );

      // Drop table
      this.logger.info('Dropping detection_heuristics table');
      await queryRunner.dropTable('detection_heuristics', true);
      this.logger.info('Successfully dropped detection_heuristics table');

      this.logger.info(
        'Rollback AddDetectionHeuristics completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddDetectionHeuristics failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
