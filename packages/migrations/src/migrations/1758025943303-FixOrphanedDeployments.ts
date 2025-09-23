import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOrphanedDeployments1758025943303 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'Cleaning up orphaned deployments before enforcing constraints...',
    );

    // Delete orphaned standard deployments (those without targets)
    const orphanedStandardsResult = await queryRunner.query(`
      DELETE FROM standard_deployments 
      WHERE target_id IS NULL OR status IS NULL
    `);
    console.log(
      `Deleted ${orphanedStandardsResult[1]} orphaned standard deployments`,
    );

    // Delete orphaned recipe deployments (those without targets)
    const orphanedRecipesResult = await queryRunner.query(`
      DELETE FROM deployments 
      WHERE target_id IS NULL OR status IS NULL
    `);
    console.log(
      `Deleted ${orphanedRecipesResult[1]} orphaned recipe deployments`,
    );

    // Now add NOT NULL constraints to required columns for standards
    await queryRunner.query(`
      ALTER TABLE "standard_deployments" 
      ALTER COLUMN "target_id" SET NOT NULL,
      ALTER COLUMN "status" SET NOT NULL
    `);

    // Add foreign key constraints for standards
    await queryRunner.query(`
      ALTER TABLE "standard_deployments" 
      ADD CONSTRAINT "FK_standard_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id"),
      ADD CONSTRAINT "FK_standard_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    `);

    // Add NOT NULL constraints to required columns for recipes
    await queryRunner.query(`
      ALTER TABLE "deployments" 
      ALTER COLUMN "target_id" SET NOT NULL,
      ALTER COLUMN "status" SET NOT NULL
    `);

    // Add foreign key constraints for recipes
    await queryRunner.query(`
      ALTER TABLE "deployments" 
      ADD CONSTRAINT "FK_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id"),
      ADD CONSTRAINT "FK_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
    `);

    // Remove old junction tables for both recipes and standards
    await queryRunner.query(`DROP TABLE IF EXISTS "deployment_git_repos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deployment_git_commits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deployment_targets"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "standard_deployment_git_repos"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "standard_deployment_git_commits"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "standard_deployment_targets"`,
    );

    console.log(
      'Migration completed successfully - orphaned deployments cleaned up and constraints added',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting deployment cleanup migration...');

    // This is complex to revert as we deleted data
    // For safety, just remove the constraints
    await queryRunner.query(`
      ALTER TABLE "standard_deployments" 
      DROP CONSTRAINT IF EXISTS "FK_standard_deployment_git_commit",
      DROP CONSTRAINT IF EXISTS "FK_standard_deployment_target",
      ALTER COLUMN "target_id" DROP NOT NULL,
      ALTER COLUMN "status" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "deployments" 
      DROP CONSTRAINT IF EXISTS "FK_deployment_git_commit",
      DROP CONSTRAINT IF EXISTS "FK_deployment_target",
      ALTER COLUMN "target_id" DROP NOT NULL,
      ALTER COLUMN "status" DROP NOT NULL
    `);

    console.log('Migration reverted - constraints removed');
  }
}
