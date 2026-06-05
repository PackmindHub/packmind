import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddDisplayNameToGitProvider1780577369702';

export class AddDisplayNameToGitProvider1780577369702 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDisplayNameToGitProvider');

    try {
      this.logger.debug('Adding display_name column to git_providers');
      await queryRunner.query(
        `ALTER TABLE "git_providers" ADD COLUMN "display_name" varchar(64) NOT NULL DEFAULT ''`,
      );

      this.logger.debug(
        'Creating partial unique index on (organization_id, lower(display_name)) for non-empty values',
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "git_providers_display_name_unique_per_org"
         ON "git_providers" ("organization_id", lower("display_name"))
         WHERE "display_name" <> '' AND "deleted_at" IS NULL`,
      );

      this.logger.info(
        'Migration AddDisplayNameToGitProvider completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddDisplayNameToGitProvider failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDisplayNameToGitProvider');

    try {
      this.logger.debug(
        'Dropping partial unique index git_providers_display_name_unique_per_org',
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "git_providers_display_name_unique_per_org"`,
      );

      this.logger.debug('Dropping display_name column from git_providers');
      await queryRunner.query(
        `ALTER TABLE "git_providers" DROP COLUMN "display_name"`,
      );

      this.logger.info(
        'Rollback AddDisplayNameToGitProvider completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddDisplayNameToGitProvider failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
