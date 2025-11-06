import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddGitProviderAndGitRepo1752327000000';

export class AddGitProviderAndGitRepo1752327000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly gitProviderTable = new Table({
    name: 'git_providers',
    columns: [
      uuidMigrationColumn,
      {
        name: 'source',
        type: 'varchar',
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly gitRepoTable = new Table({
    name: 'git_repos',
    columns: [
      uuidMigrationColumn,
      {
        name: 'owner',
        type: 'varchar',
      },
      {
        name: 'repo',
        type: 'varchar',
      },
      {
        name: 'providerId',
        type: 'uuid',
      },
      ...timestampsMigrationColumns,
    ],
  });

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['providerId'],
    referencedColumnNames: ['id'],
    referencedTableName: 'git_providers',
    onDelete: 'CASCADE',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitProviderAndGitRepo');

    try {
      this.logger.debug('Creating git_providers table');
      await queryRunner.createTable(this.gitProviderTable);
      this.logger.info('Successfully created git_providers table');

      this.logger.debug('Creating git_repos table');
      await queryRunner.createTable(this.gitRepoTable);
      this.logger.info('Successfully created git_repos table');

      this.logger.debug('Adding foreign key to git_repos table');
      await queryRunner.createForeignKey('git_repos', this.foreignKey);
      this.logger.info('Successfully added foreign key to git_repos table');

      this.logger.info(
        'Migration AddGitProviderAndGitRepo completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddGitProviderAndGitRepo failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGitProviderAndGitRepo');

    try {
      this.logger.debug('Dropping foreign key from git_repos table');
      await queryRunner.dropForeignKey('git_repos', this.foreignKey);
      this.logger.info('Successfully dropped foreign key from git_repos table');

      this.logger.debug('Dropping git_repos table');
      await queryRunner.dropTable(this.gitRepoTable);
      this.logger.info('Successfully dropped git_repos table');

      this.logger.debug('Dropping git_providers table');
      await queryRunner.dropTable(this.gitProviderTable);
      this.logger.info('Successfully dropped git_providers table');

      this.logger.info(
        'Rollback AddGitProviderAndGitRepo completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddGitProviderAndGitRepo failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
