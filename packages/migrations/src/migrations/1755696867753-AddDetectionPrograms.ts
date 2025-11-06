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

const origin = 'AddDetectionPrograms1755696867753';

export class AddDetectionPrograms1755696867753 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definitions
  private readonly detectionProgramsTable = new Table({
    name: 'detection_programs',
    columns: [
      uuidMigrationColumn,
      {
        name: 'code',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'version',
        type: 'integer',
        isNullable: false,
      },
      {
        name: 'mode',
        type: 'enum',
        enum: ['regexp', 'singleAst', 'fileSystem'],
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

  private readonly activeDetectionProgramsTable = new Table({
    name: 'active_detection_programs',
    columns: [
      uuidMigrationColumn,
      {
        name: 'detection_program_version',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'rule_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'language',
        type: 'varchar',
        length: '50',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  // Foreign key definitions
  private readonly detectionProgramsRuleForeignKey = new TableForeignKey({
    columnNames: ['rule_id'],
    referencedTableName: 'rules',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_detection_programs_rule',
  });

  private readonly activeDetectionProgramsRuleForeignKey = new TableForeignKey({
    columnNames: ['rule_id'],
    referencedTableName: 'rules',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_active_detection_programs_rule',
  });

  private readonly activeDetectionProgramsDetectionProgramForeignKey =
    new TableForeignKey({
      columnNames: ['detection_program_version'],
      referencedTableName: 'detection_programs',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'FK_active_detection_programs_detection_program',
    });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDetectionPrograms');

    try {
      // Create detection_programs table
      this.logger.debug('Creating detection_programs table');
      await queryRunner.createTable(this.detectionProgramsTable);
      this.logger.info('Successfully created detection_programs table');

      // Create active_detection_programs table
      this.logger.debug('Creating active_detection_programs table');
      await queryRunner.createTable(this.activeDetectionProgramsTable);
      this.logger.info('Successfully created active_detection_programs table');

      // Create indices for detection_programs table
      this.logger.debug('Creating indices for detection_programs table');
      await queryRunner.createIndex(
        'detection_programs',
        new TableIndex({
          name: 'idx_detection_programs_rule_id',
          columnNames: ['rule_id'],
        }),
      );
      this.logger.info(
        'Successfully created indices for detection_programs table',
      );

      // Create indices for active_detection_programs table
      this.logger.debug('Creating indices for active_detection_programs table');
      await queryRunner.createIndex(
        'active_detection_programs',
        new TableIndex({
          name: 'idx_active_detection_programs_rule_id',
          columnNames: ['rule_id'],
        }),
      );
      await queryRunner.createIndex(
        'active_detection_programs',
        new TableIndex({
          name: 'uq_active_detection_programs_rule_language',
          columnNames: ['rule_id', 'language'],
          isUnique: true,
        }),
      );
      this.logger.info(
        'Successfully created indices for active_detection_programs table',
      );

      // Create foreign keys
      this.logger.debug(
        'Adding foreign key constraints for detection_programs table',
      );
      await queryRunner.createForeignKey(
        'detection_programs',
        this.detectionProgramsRuleForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for detection_programs table',
      );

      this.logger.debug(
        'Adding foreign key constraints for active_detection_programs table',
      );
      await queryRunner.createForeignKey(
        'active_detection_programs',
        this.activeDetectionProgramsRuleForeignKey,
      );
      await queryRunner.createForeignKey(
        'active_detection_programs',
        this.activeDetectionProgramsDetectionProgramForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraints for active_detection_programs table',
      );

      this.logger.info('Migration AddDetectionPrograms completed successfully');
    } catch (error) {
      this.logger.error('Migration AddDetectionPrograms failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDetectionPrograms');

    try {
      // Drop foreign keys for active_detection_programs table
      this.logger.debug(
        'Dropping foreign key constraints for active_detection_programs table',
      );
      await queryRunner.dropForeignKey(
        'active_detection_programs',
        this.activeDetectionProgramsDetectionProgramForeignKey,
      );
      await queryRunner.dropForeignKey(
        'active_detection_programs',
        this.activeDetectionProgramsRuleForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for active_detection_programs table',
      );

      // Drop foreign keys for detection_programs table
      this.logger.debug(
        'Dropping foreign key constraints for detection_programs table',
      );
      await queryRunner.dropForeignKey(
        'detection_programs',
        this.detectionProgramsRuleForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraints for detection_programs table',
      );

      // Drop indices for active_detection_programs table
      this.logger.debug('Dropping indices for active_detection_programs table');
      await queryRunner.dropIndex(
        'active_detection_programs',
        'uq_active_detection_programs_rule_language',
      );
      await queryRunner.dropIndex(
        'active_detection_programs',
        'idx_active_detection_programs_rule_id',
      );
      this.logger.info(
        'Successfully dropped indices for active_detection_programs table',
      );

      // Drop indices for detection_programs table
      this.logger.debug('Dropping indices for detection_programs table');
      await queryRunner.dropIndex(
        'detection_programs',
        'idx_detection_programs_rule_id',
      );
      this.logger.info(
        'Successfully dropped indices for detection_programs table',
      );

      // Drop tables in reverse dependency order
      this.logger.debug('Dropping active_detection_programs table');
      await queryRunner.dropTable('active_detection_programs', true);
      this.logger.info('Successfully dropped active_detection_programs table');

      this.logger.debug('Dropping detection_programs table');
      await queryRunner.dropTable('detection_programs', true);
      this.logger.info('Successfully dropped detection_programs table');

      this.logger.info('Rollback AddDetectionPrograms completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddDetectionPrograms failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
