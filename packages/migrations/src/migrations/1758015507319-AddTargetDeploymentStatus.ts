import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetDeploymentStatus1758015507319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "deployments" 
            ADD COLUMN "git_commit_id" uuid,
            ADD COLUMN "target_id" uuid,
            ADD COLUMN "status" varchar,
            ADD COLUMN "error" text
        `);

    await queryRunner.query(`
            ALTER TABLE "standard_deployments" 
            ADD COLUMN "git_commit_id" uuid,
            ADD COLUMN "target_id" uuid,
            ADD COLUMN "status" varchar,
            ADD COLUMN "error" text
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
            ALTER TABLE "deployments" 
            DROP COLUMN "git_commit_id",
            DROP COLUMN "target_id",
            DROP COLUMN "status",
            DROP COLUMN "error"
        `);

    await queryRunner.query(`
            ALTER TABLE "standard_deployments" 
            DROP COLUMN "git_commit_id",
            DROP COLUMN "target_id",
            DROP COLUMN "status",
            DROP COLUMN "error"
        `);
  }
}
