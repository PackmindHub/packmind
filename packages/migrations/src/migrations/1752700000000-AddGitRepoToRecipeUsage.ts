import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddGitRepoToRecipeUsage1752700000000';

export class AddGitRepoToRecipeUsage1752700000000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private readonly foreignKey = new TableForeignKey({
    columnNames: ['gitRepoId'],
    referencedTableName: 'git_repos',
    referencedColumnNames: ['id'],
    onDelete: 'SET NULL',
    name: 'FK_recipe_usage_git_repo',
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitRepoToRecipeUsage');

    try {
      // Check if gitRepoId column already exists
      const columnExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_usage' 
        AND column_name = 'gitRepoId'
      `);

      if (columnExists.length === 0) {
        this.logger.debug('Adding gitRepoId column to recipe_usage table');
        await queryRunner.query(`
          ALTER TABLE "recipe_usage" 
          ADD COLUMN "gitRepoId" uuid NULL
        `);
        this.logger.info('Successfully added gitRepoId column');
      } else {
        this.logger.info(
          'gitRepoId column already exists, skipping column creation',
        );
      }

      // Check if foreign key already exists
      const foreignKeyExists = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'recipe_usage' 
        AND constraint_name = 'FK_recipe_usage_git_repo'
      `);

      if (foreignKeyExists.length === 0) {
        this.logger.debug(
          'Adding foreign key constraint to recipe_usage table',
        );
        await queryRunner.createForeignKey('recipe_usage', this.foreignKey);
        this.logger.info('Successfully added foreign key constraint');
      } else {
        this.logger.info(
          'Foreign key constraint already exists, skipping constraint creation',
        );
      }

      this.logger.info(
        'Migration AddGitRepoToRecipeUsage completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddGitRepoToRecipeUsage failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGitRepoToRecipeUsage');

    try {
      // Check if foreign key exists before trying to drop it
      const foreignKeyExists = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'recipe_usage' 
        AND constraint_name = 'FK_recipe_usage_git_repo'
      `);

      if (foreignKeyExists.length > 0) {
        this.logger.debug('Dropping foreign key constraint');
        await queryRunner.dropForeignKey('recipe_usage', this.foreignKey);
        this.logger.info('Successfully dropped foreign key constraint');
      } else {
        this.logger.info(
          'Foreign key constraint does not exist, skipping constraint removal',
        );
      }

      // Check if column exists before trying to drop it
      const columnExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_usage' 
        AND column_name = 'gitRepoId'
      `);

      if (columnExists.length > 0) {
        this.logger.debug('Dropping gitRepoId column from recipe_usage table');
        await queryRunner.query(`
          ALTER TABLE "recipe_usage" 
          DROP COLUMN "gitRepoId"
        `);
        this.logger.info('Successfully dropped gitRepoId column');
      } else {
        this.logger.info(
          'gitRepoId column does not exist, skipping column removal',
        );
      }

      this.logger.info(
        'Rollback AddGitRepoToRecipeUsage completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddGitRepoToRecipeUsage failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
