import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddGitCommit1753088052267';

export class AddGitCommit1753088052267 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly table = new Table({
    name: 'git_commits',
    columns: [
      uuidMigrationColumn,
      {
        name: 'sha',
        type: 'varchar',
      },
      {
        name: 'message',
        type: 'text',
      },
      {
        name: 'author',
        type: 'varchar',
      },
      {
        name: 'url',
        type: 'varchar',
      },
      ...timestampsMigrationColumns,
    ],
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitCommit');

    try {
      this.logger.debug('Creating git_commits table');
      await queryRunner.createTable(this.table);
      this.logger.info('Successfully created git_commits table');

      this.logger.info('Migration AddGitCommit completed successfully');
    } catch (error) {
      this.logger.error('Migration AddGitCommit failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGitCommit');

    try {
      this.logger.debug('Dropping git_commits table');
      await queryRunner.dropTable(this.table);
      this.logger.info('Successfully dropped git_commits table');

      this.logger.info('Rollback AddGitCommit completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddGitCommit failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
