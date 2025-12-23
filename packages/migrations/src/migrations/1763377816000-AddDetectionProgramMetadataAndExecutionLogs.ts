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

const origin = 'AddDetectionProgramMetadataAndExecutionLogs1763377816000';

export class AddDetectionProgramMetadataAndExecutionLogs1763377816000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // DetectionProgramMetadata table definition
  private readonly detectionProgramMetadataTable = new Table({
    name: 'detection_program_metadata',
    columns: [
      uuidMigrationColumn,
      {
        name: 'detection_program_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'task_id',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'tokens',
        type: 'jsonb',
        isNullable: true,
      },
      {
        name: 'program_description',
        type: 'text',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  // ExecutionLog table definition
  private readonly executionLogsTable = new Table({
    name: 'execution_logs',
    columns: [
      uuidMigrationColumn,
      {
        name: 'detection_program_metadata_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'timestamp',
        type: 'bigint',
        isNullable: false,
      },
      {
        name: 'message',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'metadata',
        type: 'jsonb',
        isNullable: true,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  // Index definitions for DetectionProgramMetadata
  private readonly detectionProgramIdIndex = new TableIndex({
    name: 'idx_detection_program_metadata_detection_program_id',
    columnNames: ['detection_program_id'],
  });

  private readonly taskIdIndex = new TableIndex({
    name: 'idx_detection_program_metadata_task_id',
    columnNames: ['task_id'],
  });

  // Index definitions for ExecutionLog
  private readonly executionLogsMetadataIdIndex = new TableIndex({
    name: 'idx_execution_logs_detection_program_metadata_id',
    columnNames: ['detection_program_metadata_id'],
  });

  private readonly executionLogsTimestampIndex = new TableIndex({
    name: 'idx_execution_logs_timestamp',
    columnNames: ['timestamp'],
  });

  // Foreign key definitions
  private readonly detectionProgramMetadataForeignKey = new TableForeignKey({
    columnNames: ['detection_program_id'],
    referencedTableName: 'detection_programs',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_detection_program_metadata_detection_program',
  });

  private readonly executionLogsMetadataForeignKey = new TableForeignKey({
    columnNames: ['detection_program_metadata_id'],
    referencedTableName: 'detection_program_metadata',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_execution_logs_detection_program_metadata',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddDetectionProgramMetadataAndExecutionLogs',
    );

    try {
      // Create detection_program_metadata table
      this.logger.info('Creating detection_program_metadata table');
      await queryRunner.createTable(this.detectionProgramMetadataTable);
      this.logger.info('Successfully created detection_program_metadata table');

      // Create indices for detection_program_metadata
      this.logger.info('Creating indices for detection_program_metadata table');
      await queryRunner.createIndex(
        'detection_program_metadata',
        this.detectionProgramIdIndex,
      );
      await queryRunner.createIndex(
        'detection_program_metadata',
        this.taskIdIndex,
      );
      this.logger.info(
        'Successfully created indices for detection_program_metadata table',
      );

      // Create foreign key for detection_program_metadata
      this.logger.info(
        'Adding foreign key constraint for detection_program_metadata table',
      );
      await queryRunner.createForeignKey(
        'detection_program_metadata',
        this.detectionProgramMetadataForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for detection_program_metadata table',
      );

      // Create execution_logs table
      this.logger.info('Creating execution_logs table');
      await queryRunner.createTable(this.executionLogsTable);
      this.logger.info('Successfully created execution_logs table');

      // Create indices for execution_logs
      this.logger.info('Creating indices for execution_logs table');
      await queryRunner.createIndex(
        'execution_logs',
        this.executionLogsMetadataIdIndex,
      );
      await queryRunner.createIndex(
        'execution_logs',
        this.executionLogsTimestampIndex,
      );
      this.logger.info('Successfully created indices for execution_logs table');

      // Create foreign key for execution_logs
      this.logger.info(
        'Adding foreign key constraint for execution_logs table',
      );
      await queryRunner.createForeignKey(
        'execution_logs',
        this.executionLogsMetadataForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint for execution_logs table',
      );

      this.logger.info(
        'Migration AddDetectionProgramMetadataAndExecutionLogs completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddDetectionProgramMetadataAndExecutionLogs failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddDetectionProgramMetadataAndExecutionLogs',
    );

    try {
      // Drop foreign key from execution_logs
      this.logger.info(
        'Dropping foreign key constraint for execution_logs table',
      );
      await queryRunner.dropForeignKey(
        'execution_logs',
        this.executionLogsMetadataForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for execution_logs table',
      );

      // Drop indices from execution_logs
      this.logger.info('Dropping indices for execution_logs table');
      await queryRunner.dropIndex(
        'execution_logs',
        'idx_execution_logs_timestamp',
      );
      await queryRunner.dropIndex(
        'execution_logs',
        'idx_execution_logs_detection_program_metadata_id',
      );
      this.logger.info('Successfully dropped indices for execution_logs table');

      // Drop execution_logs table
      this.logger.info('Dropping execution_logs table');
      await queryRunner.dropTable('execution_logs', true);
      this.logger.info('Successfully dropped execution_logs table');

      // Drop foreign key from detection_program_metadata
      this.logger.info(
        'Dropping foreign key constraint for detection_program_metadata table',
      );
      await queryRunner.dropForeignKey(
        'detection_program_metadata',
        this.detectionProgramMetadataForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint for detection_program_metadata table',
      );

      // Drop indices from detection_program_metadata
      this.logger.info('Dropping indices for detection_program_metadata table');
      await queryRunner.dropIndex(
        'detection_program_metadata',
        'idx_detection_program_metadata_task_id',
      );
      await queryRunner.dropIndex(
        'detection_program_metadata',
        'idx_detection_program_metadata_detection_program_id',
      );
      this.logger.info(
        'Successfully dropped indices for detection_program_metadata table',
      );

      // Drop detection_program_metadata table
      this.logger.info('Dropping detection_program_metadata table');
      await queryRunner.dropTable('detection_program_metadata', true);
      this.logger.info('Successfully dropped detection_program_metadata table');

      this.logger.info(
        'Rollback AddDetectionProgramMetadataAndExecutionLogs completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddDetectionProgramMetadataAndExecutionLogs failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
