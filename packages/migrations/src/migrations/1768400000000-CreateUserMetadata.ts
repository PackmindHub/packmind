import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';

const origin = 'CreateUserMetadata1768400000000';

export class CreateUserMetadata1768400000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  private readonly userMetadataTable = new Table({
    name: 'user_metadata',
    columns: [
      uuidMigrationColumn,
      {
        name: 'user_id',
        type: 'uuid',
        isNullable: false,
        isUnique: true,
      },
      {
        name: 'onboarding_completed',
        type: 'boolean',
        default: false,
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly userForeignKey = new TableForeignKey({
    name: 'FK_user_metadata_user',
    columnNames: ['user_id'],
    referencedTableName: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  private readonly userIdIndex = new TableIndex({
    name: 'IDX_user_metadata_user_id',
    columnNames: ['user_id'],
    isUnique: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateUserMetadata');

    try {
      this.logger.debug('Creating user_metadata table');
      await queryRunner.createTable(this.userMetadataTable, true);

      this.logger.debug('Adding foreign key user_metadata.user_id -> users.id');
      await queryRunner.createForeignKey('user_metadata', this.userForeignKey);

      this.logger.debug('Creating unique index on user_metadata.user_id');
      await queryRunner.createIndex('user_metadata', this.userIdIndex);

      this.logger.info('Migration CreateUserMetadata completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateUserMetadata failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateUserMetadata');

    try {
      this.logger.debug('Dropping unique index on user_metadata.user_id');
      await queryRunner.dropIndex('user_metadata', this.userIdIndex);

      this.logger.debug(
        'Dropping foreign key user_metadata.user_id -> users.id',
      );
      await queryRunner.dropForeignKey('user_metadata', this.userForeignKey);

      this.logger.debug('Dropping user_metadata table');
      await queryRunner.dropTable('user_metadata');

      this.logger.info('Rollback CreateUserMetadata completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateUserMetadata failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
