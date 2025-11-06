import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  timestampsMigrationColumns,
  uuidMigrationColumn,
} from '@packmind/shared/src/database/migrationColumns';

const origin = 'AddDeployments1752600000000';

export class AddDeployments1752600000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDeployments');

    try {
      // Create deployments table
      await queryRunner.createTable(
        new Table({
          name: 'deployments',
          columns: [
            uuidMigrationColumn,
            {
              name: 'authorId',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'organizationId',
              type: 'uuid',
              isNullable: false,
            },
            ...timestampsMigrationColumns,
          ],
        }),
        true,
      );

      // Create deployment_recipe_versions join table
      await queryRunner.createTable(
        new Table({
          name: 'deployment_recipe_versions',
          columns: [
            {
              name: 'deploymentId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'recipeVersionId',
              type: 'uuid',
              isNullable: false,
            },
          ],
          indices: [
            {
              name: 'IDX_DEPLOYMENT_RECIPE_VERSION',
              columnNames: ['deploymentId', 'recipeVersionId'],
              isUnique: true,
            },
          ],
        }),
        true,
      );

      // Create foreign keys for deployment_recipe_versions
      await queryRunner.createForeignKey(
        'deployment_recipe_versions',
        new TableForeignKey({
          columnNames: ['deploymentId'],
          referencedTableName: 'deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'deployment_recipe_versions',
        new TableForeignKey({
          columnNames: ['recipeVersionId'],
          referencedTableName: 'recipe_versions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Create deployment_git_repos join table
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

      // Create foreign keys for deployment_git_repos
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

      // Create foreign key for organizationId in deployments table
      await queryRunner.createForeignKey(
        'deployments',
        new TableForeignKey({
          columnNames: ['organizationId'],
          referencedTableName: 'organizations',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      this.logger.info('Migration AddDeployments completed successfully');
    } catch (error) {
      this.logger.error('Migration AddDeployments failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Rolling back migration: AddDeployments');

    try {
      // Drop join tables first
      await queryRunner.dropTable('deployment_git_repos');
      await queryRunner.dropTable('deployment_recipe_versions');

      // Then drop the main table
      await queryRunner.dropTable('deployments');

      this.logger.info('Migration AddDeployments rolled back successfully');
    } catch (error) {
      this.logger.error('Failed to roll back migration AddDeployments', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
