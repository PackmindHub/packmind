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
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateTopicsTable1763247722542';

export class CreateTopicsTable1763247722542 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly topicsTable = new Table({
    name: 'topics',
    columns: [
      uuidMigrationColumn,
      {
        name: 'space_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'title',
        type: 'varchar',
        length: '500',
        isNullable: false,
      },
      {
        name: 'content',
        type: 'text',
        isNullable: false,
      },
      {
        name: 'code_examples',
        type: 'jsonb',
        isNullable: false,
        default: "'[]'",
      },
      {
        name: 'capture_context',
        type: 'varchar',
        length: '50',
        isNullable: false,
      },
      {
        name: 'created_by',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
      ...softDeleteMigrationColumns,
    ],
  });

  private readonly topicSpaceForeignKey = new TableForeignKey({
    name: 'FK_topic_space',
    columnNames: ['space_id'],
    referencedColumnNames: ['id'],
    referencedTableName: 'spaces',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateTopicsTable');

    try {
      this.logger.debug('Creating topics table');
      await queryRunner.createTable(this.topicsTable);
      this.logger.info('Successfully created topics table');

      this.logger.debug('Adding foreign key to topics.space_id');
      await queryRunner.createForeignKey('topics', this.topicSpaceForeignKey);
      this.logger.info('Successfully added foreign key to topics.space_id');

      this.logger.debug('Creating index on topics.space_id');
      await queryRunner.query(
        'CREATE INDEX "idx_topic_space" ON "topics" ("space_id")',
      );
      this.logger.info('Successfully created index on topics.space_id');

      this.logger.debug('Creating index on topics.created_by');
      await queryRunner.query(
        'CREATE INDEX "idx_topic_created_by" ON "topics" ("created_by")',
      );
      this.logger.info('Successfully created index on topics.created_by');

      this.logger.info('Migration CreateTopicsTable completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateTopicsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateTopicsTable');

    try {
      this.logger.debug('Dropping index idx_topic_created_by');
      await queryRunner.query('DROP INDEX "idx_topic_created_by"');
      this.logger.info('Successfully dropped index idx_topic_created_by');

      this.logger.debug('Dropping index idx_topic_space');
      await queryRunner.query('DROP INDEX "idx_topic_space"');
      this.logger.info('Successfully dropped index idx_topic_space');

      this.logger.debug('Dropping foreign key from topics table');
      await queryRunner.dropForeignKey('topics', this.topicSpaceForeignKey);
      this.logger.info('Successfully dropped foreign key from topics table');

      this.logger.debug('Dropping topics table');
      await queryRunner.dropTable(this.topicsTable);
      this.logger.info('Successfully dropped topics table');

      this.logger.info('Rollback CreateTopicsTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateTopicsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
