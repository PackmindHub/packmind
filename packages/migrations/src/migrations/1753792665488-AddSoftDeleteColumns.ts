import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/shared';

export class AddSoftDeleteColumns1753792665488 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      'AddSoftDeleteColumns1753792665488',
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSoftDeleteColumns');

    try {
      const tables = [
        'recipes',
        'recipe_versions',
        'recipe_usage',
        'deployments',
        'standards',
        'standard_versions',
        'rules',
        'standard_deployments',
        'git_providers',
        'git_repos',
        'git_commits',
        'users',
        'organizations',
      ];

      for (const table of tables) {
        this.logger.debug(`Adding soft-delete columns to table: ${table}`);

        await queryRunner.query(`
                    ALTER TABLE "${table}" 
                    ADD COLUMN "deleted_at" timestamp with time zone DEFAULT NULL
                `);

        await queryRunner.query(`
                    ALTER TABLE "${table}" 
                    ADD COLUMN "deleted_by" varchar(36) DEFAULT NULL
                `);
      }

      this.logger.info('Migration AddSoftDeleteColumns completed successfully');
    } catch (error) {
      this.logger.error('Migration AddSoftDeleteColumns failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSoftDeleteColumns');

    try {
      const tables = [
        'recipes',
        'recipe_versions',
        'recipe_usage',
        'deployments',
        'standards',
        'standard_versions',
        'rules',
        'standard_deployments',
        'git_providers',
        'git_repos',
        'git_commits',
        'users',
        'organizations',
      ];

      for (const table of tables) {
        this.logger.debug(`Removing soft-delete columns from table: ${table}`);

        await queryRunner.query(`
                    ALTER TABLE "${table}" 
                    DROP COLUMN IF EXISTS "deleted_by"
                `);

        await queryRunner.query(`
                    ALTER TABLE "${table}" 
                    DROP COLUMN IF EXISTS "deleted_at"
                `);
      }

      this.logger.info('Rollback AddSoftDeleteColumns completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddSoftDeleteColumns failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
