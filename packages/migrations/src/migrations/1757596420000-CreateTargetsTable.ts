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
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CreateTargetsTable1757596420000';

export class CreateTargetsTable1757596420000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // Table definition
  private readonly targetsTable = new Table({
    name: 'targets',
    columns: [
      uuidMigrationColumn,
      {
        name: 'name',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'path',
        type: 'varchar',
        isNullable: false,
      },
      {
        name: 'git_repo_id',
        type: 'uuid',
        isNullable: false,
      },
      ...timestampsMigrationColumns,
    ],
  });

  // Foreign key definition
  private readonly targetsGitRepoForeignKey = new TableForeignKey({
    columnNames: ['git_repo_id'],
    referencedTableName: 'git_repos',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    name: 'FK_targets_git_repo',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: CreateTargetsTable');

    try {
      // Create targets table
      this.logger.debug('Creating targets table');
      await queryRunner.createTable(this.targetsTable);
      this.logger.info('Successfully created targets table');

      // Create index on git_repo_id for efficient queries
      this.logger.debug('Creating index on git_repo_id');
      await queryRunner.createIndex(
        'targets',
        new TableIndex({
          name: 'idx_targets_git_repo_id',
          columnNames: ['git_repo_id'],
        }),
      );
      this.logger.info('Successfully created index on git_repo_id');

      // Create foreign key constraint
      this.logger.debug('Adding foreign key constraint to git_repos table');
      await queryRunner.createForeignKey(
        'targets',
        this.targetsGitRepoForeignKey,
      );
      this.logger.info(
        'Successfully added foreign key constraint to git_repos table',
      );

      this.logger.info('Migration CreateTargetsTable completed successfully');
    } catch (error) {
      this.logger.error('Migration CreateTargetsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: CreateTargetsTable');

    try {
      // Drop foreign key constraint first
      this.logger.debug('Dropping foreign key constraint from targets table');
      await queryRunner.dropForeignKey(
        'targets',
        this.targetsGitRepoForeignKey,
      );
      this.logger.info(
        'Successfully dropped foreign key constraint from targets table',
      );

      // Drop index
      this.logger.debug('Dropping index on git_repo_id');
      await queryRunner.dropIndex('targets', 'idx_targets_git_repo_id');
      this.logger.info('Successfully dropped index on git_repo_id');

      // Drop targets table
      this.logger.debug('Dropping targets table');
      await queryRunner.dropTable('targets', true);
      this.logger.info('Successfully dropped targets table');

      this.logger.info('Rollback CreateTargetsTable completed successfully');
    } catch (error) {
      this.logger.error('Rollback CreateTargetsTable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
