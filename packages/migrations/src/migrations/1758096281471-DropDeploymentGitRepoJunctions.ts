import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'DropDeploymentGitRepoJunctions1758096281471';

export class DropDeploymentGitRepoJunctions1758096281471
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropDeploymentGitRepoJunctions');

    try {
      // Drop foreign keys first for deployment_git_repos
      this.logger.debug('Dropping foreign keys for deployment_git_repos');

      // Check if foreign keys exist before trying to drop them
      const deploymentGitReposForeignKeys = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'deployment_git_repos' 
        AND constraint_type = 'FOREIGN KEY'
      `);

      for (const fk of deploymentGitReposForeignKeys) {
        await queryRunner.dropForeignKey(
          'deployment_git_repos',
          fk.constraint_name,
        );
      }

      // Drop foreign keys for standard_deployment_git_repos
      this.logger.debug(
        'Dropping foreign keys for standard_deployment_git_repos',
      );

      const standardDeploymentGitReposForeignKeys = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'standard_deployment_git_repos' 
        AND constraint_type = 'FOREIGN KEY'
      `);

      for (const fk of standardDeploymentGitReposForeignKeys) {
        await queryRunner.dropForeignKey(
          'standard_deployment_git_repos',
          fk.constraint_name,
        );
      }

      // Drop the junction tables
      this.logger.debug('Dropping deployment_git_repos table');
      await queryRunner.dropTable('deployment_git_repos', true);

      this.logger.debug('Dropping standard_deployment_git_repos table');
      await queryRunner.dropTable('standard_deployment_git_repos', true);

      this.logger.info(
        'Migration DropDeploymentGitRepoJunctions completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropDeploymentGitRepoJunctions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropDeploymentGitRepoJunctions');

    try {
      // Recreate deployment_git_repos table
      this.logger.debug('Recreating deployment_git_repos table');
      await queryRunner.createTable(
        new Table({
          name: 'deployment_git_repos',
          columns: [
            {
              name: 'deploymentId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'gitRepoId',
              type: 'uuid',
              isNullable: false,
            },
          ],
          indices: [
            {
              name: 'IDX_DEPLOYMENT_GIT_REPO',
              columnNames: ['deploymentId', 'gitRepoId'],
              isUnique: true,
            },
          ],
        }),
        true,
      );

      // Recreate standard_deployment_git_repos table
      this.logger.debug('Recreating standard_deployment_git_repos table');
      await queryRunner.createTable(
        new Table({
          name: 'standard_deployment_git_repos',
          columns: [
            {
              name: 'standard_deployment_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'git_repo_id',
              type: 'uuid',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Recreate foreign keys for deployment_git_repos
      this.logger.debug('Recreating foreign keys for deployment_git_repos');
      await queryRunner.createForeignKey(
        'deployment_git_repos',
        new TableForeignKey({
          columnNames: ['deploymentId'],
          referencedTableName: 'deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'deployment_git_repos',
        new TableForeignKey({
          columnNames: ['gitRepoId'],
          referencedTableName: 'git_repos',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Recreate foreign keys for standard_deployment_git_repos
      this.logger.debug(
        'Recreating foreign keys for standard_deployment_git_repos',
      );
      await queryRunner.createForeignKey(
        'standard_deployment_git_repos',
        new TableForeignKey({
          columnNames: ['standard_deployment_id'],
          referencedTableName: 'standard_deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'standard_deployment_git_repos',
        new TableForeignKey({
          columnNames: ['git_repo_id'],
          referencedTableName: 'git_repos',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      this.logger.info(
        'Rollback DropDeploymentGitRepoJunctions completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropDeploymentGitRepoJunctions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
