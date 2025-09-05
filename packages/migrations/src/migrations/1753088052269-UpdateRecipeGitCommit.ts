import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'UpdateRecipeGitCommit1753088052269';

export class UpdateRecipeGitCommit1753088052269 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateRecipeGitCommit');

    try {
      // Add gitCommitId column to recipes table
      this.logger.debug('Adding git_commit_id column to recipes table');
      await queryRunner.addColumn(
        'recipes',
        new TableColumn({
          name: 'git_commit_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add gitCommitId column to recipe_versions table
      this.logger.debug('Adding git_commit_id column to recipe_versions table');
      await queryRunner.addColumn(
        'recipe_versions',
        new TableColumn({
          name: 'git_commit_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add foreign key constraint for recipes table
      this.logger.debug(
        'Adding foreign key constraint for recipes.gitCommitId',
      );
      await queryRunner.createForeignKey(
        'recipes',
        new TableForeignKey({
          columnNames: ['git_commit_id'],
          referencedTableName: 'git_commits',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      // Add foreign key constraint for recipe_versions table
      this.logger.debug(
        'Adding foreign key constraint for recipe_versions.gitCommitId',
      );
      await queryRunner.createForeignKey(
        'recipe_versions',
        new TableForeignKey({
          columnNames: ['git_commit_id'],
          referencedTableName: 'git_commits',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      // Remove old columns from recipes table (if they exist)
      this.logger.debug('Removing old columns from recipes table');
      await queryRunner.query(
        'ALTER TABLE "recipes" DROP COLUMN IF EXISTS "author"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipes" DROP COLUMN IF EXISTS "git_sha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipes" DROP COLUMN IF EXISTS "git_repo"',
      );

      // Remove old columns from recipe_versions table (if they exist)
      this.logger.debug('Removing old columns from recipe_versions table');
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" DROP COLUMN IF EXISTS "author"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" DROP COLUMN IF EXISTS "git_sha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" DROP COLUMN IF EXISTS "git_repo"',
      );

      this.logger.info(
        'Migration UpdateRecipeGitCommit completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateRecipeGitCommit failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateRecipeGitCommit');

    try {
      // Add back old columns to recipes table (if they don't exist)
      this.logger.debug('Adding back old columns to recipes table');
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'author') THEN
            ALTER TABLE "recipes" ADD COLUMN "author" varchar NULL;
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'gitSha') THEN
            ALTER TABLE "recipes" ADD COLUMN "gitSha" varchar NULL;
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'gitRepo') THEN
            ALTER TABLE "recipes" ADD COLUMN "gitRepo" varchar NULL;
          END IF;
        END $$;
      `);

      // Add back old columns to recipe_versions table (if they don't exist)
      this.logger.debug('Adding back old columns to recipe_versions table');
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_versions' AND column_name = 'author') THEN
            ALTER TABLE "recipe_versions" ADD COLUMN "author" varchar NULL;
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_versions' AND column_name = 'gitSha') THEN
            ALTER TABLE "recipe_versions" ADD COLUMN "gitSha" varchar NULL;
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_versions' AND column_name = 'gitRepo') THEN
            ALTER TABLE "recipe_versions" ADD COLUMN "gitRepo" varchar NULL;
          END IF;
        END $$;
      `);

      // Drop foreign key constraints (if they exist)
      this.logger.debug('Checking and dropping foreign key constraints');
      const recipesTable = await queryRunner.getTable('recipes');
      const recipeVersionsTable = await queryRunner.getTable('recipe_versions');

      const recipesForeignKey = recipesTable?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('git_commit_id') !== -1,
      );
      const recipeVersionsForeignKey = recipeVersionsTable?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('git_commit_id') !== -1,
      );

      if (recipesForeignKey) {
        this.logger.debug('Dropping foreign key constraint from recipes table');
        await queryRunner.dropForeignKey('recipes', recipesForeignKey);
      } else {
        this.logger.debug(
          'No foreign key constraint found on recipes table, skipping',
        );
      }

      if (recipeVersionsForeignKey) {
        this.logger.debug(
          'Dropping foreign key constraint from recipe_versions table',
        );
        await queryRunner.dropForeignKey(
          'recipe_versions',
          recipeVersionsForeignKey,
        );
      } else {
        this.logger.debug(
          'No foreign key constraint found on recipe_versions table, skipping',
        );
      }

      // Drop gitCommitId columns (if they exist)
      this.logger.debug('Dropping gitCommitId columns');
      await queryRunner.query(
        'ALTER TABLE "recipes" DROP COLUMN IF EXISTS "git_commit_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" DROP COLUMN IF EXISTS "git_commit_id"',
      );

      this.logger.info('Rollback UpdateRecipeGitCommit completed successfully');
    } catch (error) {
      this.logger.error('Rollback UpdateRecipeGitCommit failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
