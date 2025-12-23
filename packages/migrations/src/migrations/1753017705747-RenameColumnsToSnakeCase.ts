import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'RenameColumnsToSnakeCase1753017705747';

export class RenameColumnsToSnakeCase1753017705747 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: RenameColumnsToSnakeCase');

    try {
      // Rename columns in users table
      this.logger.debug('Renaming columns in users table');
      await queryRunner.query(
        'ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash"',
      );
      await queryRunner.query(
        'ALTER TABLE "users" RENAME COLUMN "organizationId" TO "organization_id"',
      );

      // Rename columns in git_providers table
      this.logger.debug('Renaming columns in git_providers table');
      await queryRunner.query(
        'ALTER TABLE "git_providers" RENAME COLUMN "organizationId" TO "organization_id"',
      );

      // Rename columns in git_repos table
      this.logger.debug('Renaming columns in git_repos table');
      await queryRunner.query(
        'ALTER TABLE "git_repos" RENAME COLUMN "providerId" TO "provider_id"',
      );

      // Rename columns in recipes table
      this.logger.debug('Renaming columns in recipes table');
      await queryRunner.query(
        'ALTER TABLE "recipes" RENAME COLUMN "gitSha" TO "git_sha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipes" RENAME COLUMN "gitRepo" TO "git_repo"',
      );

      // Rename columns in recipe_versions table
      this.logger.debug('Renaming columns in recipe_versions table');
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "recipeId" TO "recipe_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "gitSha" TO "git_sha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "gitRepo" TO "git_repo"',
      );

      // Rename columns in deployments table
      this.logger.debug('Renaming columns in deployments table');
      await queryRunner.query(
        'ALTER TABLE "deployments" RENAME COLUMN "authorId" TO "author_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployments" RENAME COLUMN "organizationId" TO "organization_id"',
      );

      // Rename columns in recipe_usage table
      this.logger.debug('Renaming columns in recipe_usage table');
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "recipeId" TO "recipe_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "usedAt" TO "used_at"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "aiAgent" TO "ai_agent"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "gitRepoId" TO "git_repo_id"',
      );

      // Rename columns in deployment_recipe_versions junction table
      this.logger.debug('Renaming columns in deployment_recipe_versions table');
      await queryRunner.query(
        'ALTER TABLE "deployment_recipe_versions" RENAME COLUMN "deploymentId" TO "deployment_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployment_recipe_versions" RENAME COLUMN "recipeVersionId" TO "recipe_version_id"',
      );

      // Rename columns in deployment_git_repos junction table
      this.logger.debug('Renaming columns in deployment_git_repos table');
      await queryRunner.query(
        'ALTER TABLE "deployment_git_repos" RENAME COLUMN "deploymentId" TO "deployment_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployment_git_repos" RENAME COLUMN "gitRepoId" TO "git_repo_id"',
      );

      this.logger.info(
        'Migration RenameColumnsToSnakeCase completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration RenameColumnsToSnakeCase failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: RenameColumnsToSnakeCase');

    try {
      // Rollback columns in deployment_git_repos junction table
      this.logger.debug('Rolling back columns in deployment_git_repos table');
      await queryRunner.query(
        'ALTER TABLE "deployment_git_repos" RENAME COLUMN "deployment_id" TO "deploymentId"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployment_git_repos" RENAME COLUMN "git_repo_id" TO "gitRepoId"',
      );

      // Rollback columns in deployment_recipe_versions junction table
      this.logger.debug(
        'Rolling back columns in deployment_recipe_versions table',
      );
      await queryRunner.query(
        'ALTER TABLE "deployment_recipe_versions" RENAME COLUMN "deployment_id" TO "deploymentId"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployment_recipe_versions" RENAME COLUMN "recipe_version_id" TO "recipeVersionId"',
      );

      // Rollback columns in recipe_usage table
      this.logger.debug('Rolling back columns in recipe_usage table');
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "recipe_id" TO "recipeId"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "used_at" TO "usedAt"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "ai_agent" TO "aiAgent"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_usage" RENAME COLUMN "git_repo_id" TO "gitRepoId"',
      );

      // Rollback columns in deployments table
      this.logger.debug('Rolling back columns in deployments table');
      await queryRunner.query(
        'ALTER TABLE "deployments" RENAME COLUMN "author_id" TO "authorId"',
      );
      await queryRunner.query(
        'ALTER TABLE "deployments" RENAME COLUMN "organization_id" TO "organizationId"',
      );

      // Rollback columns in recipe_versions table
      this.logger.debug('Rolling back columns in recipe_versions table');
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "recipe_id" TO "recipeId"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "git_sha" TO "gitSha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipe_versions" RENAME COLUMN "git_repo" TO "gitRepo"',
      );

      // Rollback columns in recipes table
      this.logger.debug('Rolling back columns in recipes table');
      await queryRunner.query(
        'ALTER TABLE "recipes" RENAME COLUMN "git_sha" TO "gitSha"',
      );
      await queryRunner.query(
        'ALTER TABLE "recipes" RENAME COLUMN "git_repo" TO "gitRepo"',
      );

      // Rollback columns in git_repos table
      this.logger.debug('Rolling back columns in git_repos table');
      await queryRunner.query(
        'ALTER TABLE "git_repos" RENAME COLUMN "provider_id" TO "providerId"',
      );

      // Rollback columns in git_providers table
      this.logger.debug('Rolling back columns in git_providers table');
      await queryRunner.query(
        'ALTER TABLE "git_providers" RENAME COLUMN "organization_id" TO "organizationId"',
      );

      // Rollback columns in users table
      this.logger.debug('Rolling back columns in users table');
      await queryRunner.query(
        'ALTER TABLE "users" RENAME COLUMN "organization_id" TO "organizationId"',
      );
      await queryRunner.query(
        'ALTER TABLE "users" RENAME COLUMN "password_hash" TO "passwordHash"',
      );

      this.logger.info(
        'Rollback RenameColumnsToSnakeCase completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback RenameColumnsToSnakeCase failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
