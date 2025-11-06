import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddGitInfoToRecipes1752155443452';

export class AddGitInfoToRecipes1752155443452 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGitInfoToRecipes');

    try {
      // Add git-related columns to recipes table
      this.logger.debug('Adding git-related columns to recipes table');
      await queryRunner.query(`
            ALTER TABLE "recipes" 
            ADD COLUMN "author" varchar NULL,
            ADD COLUMN "gitSha" varchar NULL,
            ADD COLUMN "gitRepo" varchar NULL
        `);
      this.logger.info(
        'Successfully added git-related columns to recipes table',
      );

      // Add git-related columns to recipe_versions table
      this.logger.debug('Adding git-related columns to recipe_versions table');
      await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            ADD COLUMN "author" varchar NULL,
            ADD COLUMN "gitSha" varchar NULL,
            ADD COLUMN "gitRepo" varchar NULL
        `);
      this.logger.info(
        'Successfully added git-related columns to recipe_versions table',
      );

      this.logger.info('Migration AddGitInfoToRecipes completed successfully');
    } catch (error) {
      this.logger.error('Migration AddGitInfoToRecipes failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGitInfoToRecipes');

    try {
      // Remove git-related columns from recipes table
      this.logger.debug('Removing git-related columns from recipes table');
      await queryRunner.query(`
            ALTER TABLE "recipes" 
            DROP COLUMN "author",
            DROP COLUMN "gitSha",
            DROP COLUMN "gitRepo"
        `);
      this.logger.info(
        'Successfully removed git-related columns from recipes table',
      );

      // Remove git-related columns from recipe_versions table
      this.logger.debug(
        'Removing git-related columns from recipe_versions table',
      );
      await queryRunner.query(`
            ALTER TABLE "recipe_versions" 
            DROP COLUMN "author",
            DROP COLUMN "gitSha",
            DROP COLUMN "gitRepo"
        `);
      this.logger.info(
        'Successfully removed git-related columns from recipe_versions table',
      );

      this.logger.info('Rollback AddGitInfoToRecipes completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddGitInfoToRecipes failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
