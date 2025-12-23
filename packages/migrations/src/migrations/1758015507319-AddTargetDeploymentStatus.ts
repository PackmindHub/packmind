import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetDeploymentStatus1758015507319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to deployments table
    await queryRunner.query(`
            ALTER TABLE "deployments" 
            ADD COLUMN "git_commit_id" uuid,
            ADD COLUMN "target_id" uuid,
            ADD COLUMN "status" varchar,
            ADD COLUMN "error" text
        `);

    // Add new columns to standard_deployments table
    await queryRunner.query(`
            ALTER TABLE "standard_deployments" 
            ADD COLUMN "git_commit_id" uuid,
            ADD COLUMN "target_id" uuid,
            ADD COLUMN "status" varchar,
            ADD COLUMN "error" text
        `);

    // Add foreign key constraints (will be activated after data migration)
    // Note: These are commented out for now as they will be added after data migration
    // await queryRunner.query(`
    //     ALTER TABLE "deployments"
    //     ADD CONSTRAINT "FK_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id"),
    //     ADD CONSTRAINT "FK_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    // `);

    // await queryRunner.query(`
    //     ALTER TABLE "standard_deployments"
    //     ADD CONSTRAINT "FK_standard_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id"),
    //     ADD CONSTRAINT "FK_standard_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints (if they exist)
    await queryRunner.query(`
            ALTER TABLE "deployments" 
            DROP CONSTRAINT IF EXISTS "FK_deployment_git_commit",
            DROP CONSTRAINT IF EXISTS "FK_deployment_target"
        `);

    await queryRunner.query(`
            ALTER TABLE "standard_deployments" 
            DROP CONSTRAINT IF EXISTS "FK_standard_deployment_git_commit",
            DROP CONSTRAINT IF EXISTS "FK_standard_deployment_target"
        `);

    // Remove new columns from deployments table
    await queryRunner.query(`
            ALTER TABLE "deployments" 
            DROP COLUMN "git_commit_id",
            DROP COLUMN "target_id",
            DROP COLUMN "status",
            DROP COLUMN "error"
        `);

    // Remove new columns from standard_deployments table
    await queryRunner.query(`
            ALTER TABLE "standard_deployments" 
            DROP COLUMN "git_commit_id",
            DROP COLUMN "target_id",
            DROP COLUMN "status",
            DROP COLUMN "error"
        `);
  }
}
