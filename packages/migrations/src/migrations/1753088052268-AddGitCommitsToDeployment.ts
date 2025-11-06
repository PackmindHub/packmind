import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddGitCommitsToDeployment1753088052268';

export class AddGitCommitsToDeployment1753088052268
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitCommitsToDeployment');

    try {
      // Create deployment_git_commits join table
      await queryRunner.createTable(
        new Table({
          name: 'deployment_git_commits',
          columns: [
            {
              name: 'deployment_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'git_commit_id',
              type: 'uuid',
              isNullable: false,
            },
          ],
          indices: [
            {
              name: 'IDX_DEPLOYMENT_GIT_COMMIT',
              columnNames: ['deployment_id', 'git_commit_id'],
              isUnique: true,
            },
          ],
        }),
        true,
      );

      // Create foreign keys for deployment_git_commits
      await queryRunner.createForeignKey(
        'deployment_git_commits',
        new TableForeignKey({
          columnNames: ['deployment_id'],
          referencedTableName: 'deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'deployment_git_commits',
        new TableForeignKey({
          columnNames: ['git_commit_id'],
          referencedTableName: 'git_commits',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      this.logger.info(
        'Migration AddGitCommitsToDeployment completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddGitCommitsToDeployment failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Rolling back migration: AddGitCommitsToDeployment');

    try {
      // Drop the join table
      await queryRunner.dropTable('deployment_git_commits');

      this.logger.info(
        'Migration AddGitCommitsToDeployment rolled back successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to roll back migration AddGitCommitsToDeployment',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
