import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropStandardDeploymentsTables1764952425000';

/**
 * Migration to drop the StandardsDeployment tables.
 *
 * This migration removes the standard_deployments and standard_deployment_versions tables
 * as the deployment functionality has been migrated to the Distribution system.
 *
 * Tables dropped:
 * - standard_deployment_versions (junction table)
 * - standard_deployments (main table)
 */
export class DropStandardDeploymentsTables1764952425000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropStandardDeploymentsTables');

    try {
      // Drop foreign key constraints on standard_deployment_versions first
      this.logger.info(
        'Dropping foreign key constraints on standard_deployment_versions',
      );
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "standard_deployment_versions"
        DROP CONSTRAINT IF EXISTS "FK_standard_deployment_versions_deployment"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "standard_deployment_versions"
        DROP CONSTRAINT IF EXISTS "FK_standard_deployment_versions_version"
      `);

      // Drop the junction table first
      this.logger.info('Dropping standard_deployment_versions table');
      await queryRunner.query(
        `DROP TABLE IF EXISTS "standard_deployment_versions"`,
      );
      this.logger.info('Successfully dropped standard_deployment_versions');

      // Drop foreign key constraints on standard_deployments
      this.logger.info(
        'Dropping foreign key constraints on standard_deployments',
      );
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "standard_deployments"
        DROP CONSTRAINT IF EXISTS "FK_standard_deployments_organization"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "standard_deployments"
        DROP CONSTRAINT IF EXISTS "FK_standard_deployment_git_commit"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "standard_deployments"
        DROP CONSTRAINT IF EXISTS "FK_standard_deployment_target"
      `);

      // Drop indexes on standard_deployments
      this.logger.info('Dropping indexes on standard_deployments');
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_standard_deployment_organization"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_standard_deployment_author"`,
      );

      // Drop the main table
      this.logger.info('Dropping standard_deployments table');
      await queryRunner.query(`DROP TABLE IF EXISTS "standard_deployments"`);
      this.logger.info('Successfully dropped standard_deployments');

      this.logger.info(
        'Migration DropStandardDeploymentsTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropStandardDeploymentsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropStandardDeploymentsTables');

    try {
      // Recreate standard_deployments table
      this.logger.info('Recreating standard_deployments table');
      await queryRunner.query(`
        CREATE TABLE "standard_deployments" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "author_id" character varying NOT NULL,
          "organization_id" uuid NOT NULL,
          "git_commit_id" uuid,
          "target_id" uuid NOT NULL,
          "status" character varying NOT NULL,
          "error" text,
          "render_modes" json NOT NULL DEFAULT '[]',
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMP,
          CONSTRAINT "PK_standard_deployments" PRIMARY KEY ("id")
        )
      `);

      // Recreate indexes
      this.logger.info('Recreating indexes on standard_deployments');
      await queryRunner.query(`
        CREATE INDEX "idx_standard_deployment_organization" ON "standard_deployments" ("organization_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_standard_deployment_author" ON "standard_deployments" ("author_id")
      `);

      // Recreate foreign keys
      this.logger.info(
        'Recreating foreign key constraints on standard_deployments',
      );
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD CONSTRAINT "FK_standard_deployments_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD CONSTRAINT "FK_standard_deployment_git_commit"
        FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id")
      `);
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD CONSTRAINT "FK_standard_deployment_target"
        FOREIGN KEY ("target_id") REFERENCES "targets"("id")
      `);

      // Recreate standard_deployment_versions junction table
      this.logger.info('Recreating standard_deployment_versions table');
      await queryRunner.query(`
        CREATE TABLE "standard_deployment_versions" (
          "standard_deployment_id" uuid NOT NULL,
          "standard_version_id" uuid NOT NULL
        )
      `);

      // Recreate unique index
      await queryRunner.query(`
        CREATE UNIQUE INDEX "idx_standard_deployment_version_unique"
        ON "standard_deployment_versions" ("standard_deployment_id", "standard_version_id")
      `);

      // Recreate foreign keys for junction table
      this.logger.info(
        'Recreating foreign key constraints on standard_deployment_versions',
      );
      await queryRunner.query(`
        ALTER TABLE "standard_deployment_versions"
        ADD CONSTRAINT "FK_standard_deployment_versions_deployment"
        FOREIGN KEY ("standard_deployment_id") REFERENCES "standard_deployments"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "standard_deployment_versions"
        ADD CONSTRAINT "FK_standard_deployment_versions_version"
        FOREIGN KEY ("standard_version_id") REFERENCES "standard_versions"("id") ON DELETE CASCADE
      `);

      this.logger.info(
        'Rollback DropStandardDeploymentsTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropStandardDeploymentsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
