import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddGithubAppFieldsToGitProviders1779000000001';

export class AddGithubAppFieldsToGitProviders1779000000001 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddGithubAppFieldsToGitProviders');

    try {
      this.logger.debug('Adding auth_type column to git_providers');
      await queryRunner.query(
        `ALTER TABLE "git_providers" ADD COLUMN "auth_type" varchar(32) NOT NULL DEFAULT 'pat'`,
      );

      this.logger.debug(
        'Adding github_app_installation_id column to git_providers',
      );
      await queryRunner.query(
        `ALTER TABLE "git_providers" ADD COLUMN "github_app_installation_id" bigint`,
      );

      this.logger.debug(
        'Creating index on git_providers.github_app_installation_id',
      );
      await queryRunner.query(
        `CREATE INDEX "idx_git_providers_github_app_installation_id" ON "git_providers" ("github_app_installation_id") WHERE "github_app_installation_id" IS NOT NULL`,
      );

      this.logger.info(
        'Migration AddGithubAppFieldsToGitProviders completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddGithubAppFieldsToGitProviders failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddGithubAppFieldsToGitProviders');

    try {
      this.logger.debug(
        'Dropping index on git_providers.github_app_installation_id',
      );
      await queryRunner.query(
        `DROP INDEX "idx_git_providers_github_app_installation_id"`,
      );

      this.logger.debug(
        'Dropping github_app_installation_id column from git_providers',
      );
      await queryRunner.query(
        `ALTER TABLE "git_providers" DROP COLUMN "github_app_installation_id"`,
      );

      this.logger.debug('Dropping auth_type column from git_providers');
      await queryRunner.query(
        `ALTER TABLE "git_providers" DROP COLUMN "auth_type"`,
      );

      this.logger.info(
        'Rollback AddGithubAppFieldsToGitProviders completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddGithubAppFieldsToGitProviders failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
