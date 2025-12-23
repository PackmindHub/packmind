import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropRecipesDeploymentsTables1764952426000';

/**
 * Migration to drop the RecipesDeployment tables.
 *
 * This migration removes the deployments and deployment_recipe_versions tables
 * as the deployment functionality has been migrated to the Distribution system.
 *
 * Tables dropped:
 * - deployment_recipe_versions (junction table)
 * - deployments (main table)
 */
export class DropRecipesDeploymentsTables1764952426000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropRecipesDeploymentsTables');

    try {
      // Drop foreign key constraints on deployment_recipe_versions first
      this.logger.info(
        'Dropping foreign key constraints on deployment_recipe_versions',
      );
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "deployment_recipe_versions"
        DROP CONSTRAINT IF EXISTS "FK_deployment_recipe_versions_deployment"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "deployment_recipe_versions"
        DROP CONSTRAINT IF EXISTS "FK_deployment_recipe_versions_version"
      `);

      // Drop the junction table first
      this.logger.info('Dropping deployment_recipe_versions table');
      await queryRunner.query(
        `DROP TABLE IF EXISTS "deployment_recipe_versions"`,
      );
      this.logger.info('Successfully dropped deployment_recipe_versions');

      // Drop foreign key constraints on deployments
      this.logger.info('Dropping foreign key constraints on deployments');
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "deployments"
        DROP CONSTRAINT IF EXISTS "FK_deployments_organization"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "deployments"
        DROP CONSTRAINT IF EXISTS "FK_deployment_git_commit"
      `);
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "deployments"
        DROP CONSTRAINT IF EXISTS "FK_deployment_target"
      `);

      // Drop indexes on deployments
      this.logger.info('Dropping indexes on deployments');
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_deployment_organization"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_deployment_author"`);

      // Drop the main table
      this.logger.info('Dropping deployments table');
      await queryRunner.query(`DROP TABLE IF EXISTS "deployments"`);
      this.logger.info('Successfully dropped deployments');

      this.logger.info(
        'Migration DropRecipesDeploymentsTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropRecipesDeploymentsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropRecipesDeploymentsTables');

    try {
      // Recreate deployments table
      this.logger.info('Recreating deployments table');
      await queryRunner.query(`
        CREATE TABLE "deployments" (
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
          CONSTRAINT "PK_deployments" PRIMARY KEY ("id")
        )
      `);

      // Recreate indexes
      this.logger.info('Recreating indexes on deployments');
      await queryRunner.query(`
        CREATE INDEX "idx_deployment_organization" ON "deployments" ("organization_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_deployment_author" ON "deployments" ("author_id")
      `);

      // Recreate foreign keys
      this.logger.info('Recreating foreign key constraints on deployments');
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD CONSTRAINT "FK_deployments_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD CONSTRAINT "FK_deployment_git_commit"
        FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id")
      `);
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD CONSTRAINT "FK_deployment_target"
        FOREIGN KEY ("target_id") REFERENCES "targets"("id")
      `);

      // Recreate deployment_recipe_versions junction table
      this.logger.info('Recreating deployment_recipe_versions table');
      await queryRunner.query(`
        CREATE TABLE "deployment_recipe_versions" (
          "deployment_id" uuid NOT NULL,
          "recipe_version_id" uuid NOT NULL
        )
      `);

      // Recreate unique index
      await queryRunner.query(`
        CREATE UNIQUE INDEX "idx_deployment_recipe_version_unique"
        ON "deployment_recipe_versions" ("deployment_id", "recipe_version_id")
      `);

      // Recreate foreign keys for junction table
      this.logger.info(
        'Recreating foreign key constraints on deployment_recipe_versions',
      );
      await queryRunner.query(`
        ALTER TABLE "deployment_recipe_versions"
        ADD CONSTRAINT "FK_deployment_recipe_versions_deployment"
        FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "deployment_recipe_versions"
        ADD CONSTRAINT "FK_deployment_recipe_versions_version"
        FOREIGN KEY ("recipe_version_id") REFERENCES "recipe_versions"("id") ON DELETE CASCADE
      `);

      this.logger.info(
        'Rollback DropRecipesDeploymentsTables completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropRecipesDeploymentsTables failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
