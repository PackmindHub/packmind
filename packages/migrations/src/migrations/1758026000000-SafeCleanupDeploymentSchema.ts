import { MigrationInterface, QueryRunner } from 'typeorm';

export class SafeCleanupDeploymentSchema1758026000000 implements MigrationInterface {
  name = 'SafeCleanupDeploymentSchema1758026000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Safely cleaning up deployment schema...');

    console.log('Cleaning up orphaned deployments...');
    await queryRunner.query(
      `DELETE FROM standard_deployments WHERE target_id IS NULL OR status IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM deployments WHERE target_id IS NULL OR status IS NULL`,
    );

    console.log('Checking and adding NOT NULL constraints for standards...');

    const targetIdNotNull = await queryRunner.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'standard_deployments' 
      AND column_name = 'target_id'
    `);

    const statusNotNull = await queryRunner.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'standard_deployments' 
      AND column_name = 'status'
    `);

    const targetIdNullable =
      targetIdNotNull.length > 0 && targetIdNotNull[0].is_nullable === 'YES';
    const statusNullable =
      statusNotNull.length > 0 && statusNotNull[0].is_nullable === 'YES';

    if (targetIdNullable || statusNullable) {
      const alterQueries = [];
      if (targetIdNullable)
        alterQueries.push('ALTER COLUMN "target_id" SET NOT NULL');
      if (statusNullable)
        alterQueries.push('ALTER COLUMN "status" SET NOT NULL');

      if (alterQueries.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "standard_deployments"
          ${alterQueries.join(', ')}
        `);
        console.log('Added NOT NULL constraints for standards');
      }
    } else {
      console.log(
        'NOT NULL constraints for standards already exist, skipping...',
      );
    }

    console.log('Checking and adding foreign key constraints for standards...');

    const gitCommitConstraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_standard_deployment_git_commit' 
      AND table_name = 'standard_deployments'
    `);

    if (!gitCommitConstraintExists || gitCommitConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD CONSTRAINT "FK_standard_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id")
      `);
      console.log('Added FK constraint FK_standard_deployment_git_commit');
    } else {
      console.log(
        'FK constraint FK_standard_deployment_git_commit already exists, skipping...',
      );
    }

    const targetConstraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_standard_deployment_target' 
      AND table_name = 'standard_deployments'
    `);

    if (!targetConstraintExists || targetConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD CONSTRAINT "FK_standard_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
      `);
      console.log('Added FK constraint FK_standard_deployment_target');
    } else {
      console.log(
        'FK constraint FK_standard_deployment_target already exists, skipping...',
      );
    }

    console.log('Checking and adding NOT NULL constraints for recipes...');

    const recipeTargetIdNotNull = await queryRunner.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'deployments' 
      AND column_name = 'target_id'
    `);

    const recipeStatusNotNull = await queryRunner.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'deployments' 
      AND column_name = 'status'
    `);

    const recipeTargetIdNullable =
      recipeTargetIdNotNull.length > 0 &&
      recipeTargetIdNotNull[0].is_nullable === 'YES';
    const recipeStatusNullable =
      recipeStatusNotNull.length > 0 &&
      recipeStatusNotNull[0].is_nullable === 'YES';

    if (recipeTargetIdNullable || recipeStatusNullable) {
      const alterQueries = [];
      if (recipeTargetIdNullable)
        alterQueries.push('ALTER COLUMN "target_id" SET NOT NULL');
      if (recipeStatusNullable)
        alterQueries.push('ALTER COLUMN "status" SET NOT NULL');

      if (alterQueries.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "deployments"
          ${alterQueries.join(', ')}
        `);
        console.log('Added NOT NULL constraints for recipes');
      }
    } else {
      console.log(
        'NOT NULL constraints for recipes already exist, skipping...',
      );
    }

    console.log('Checking and adding foreign key constraints for recipes...');

    const recipeGitCommitConstraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_deployment_git_commit' 
      AND table_name = 'deployments'
    `);

    if (
      !recipeGitCommitConstraintExists ||
      recipeGitCommitConstraintExists.length === 0
    ) {
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD CONSTRAINT "FK_deployment_git_commit" FOREIGN KEY ("git_commit_id") REFERENCES "git_commits"("id")
      `);
      console.log('Added FK constraint FK_deployment_git_commit');
    } else {
      console.log(
        'FK constraint FK_deployment_git_commit already exists, skipping...',
      );
    }

    const recipeTargetConstraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_deployment_target' 
      AND table_name = 'deployments'
    `);

    if (
      !recipeTargetConstraintExists ||
      recipeTargetConstraintExists.length === 0
    ) {
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD CONSTRAINT "FK_deployment_target" FOREIGN KEY ("target_id") REFERENCES "targets"("id")
      `);
      console.log('Added FK constraint FK_deployment_target');
    } else {
      console.log(
        'FK constraint FK_deployment_target already exists, skipping...',
      );
    }

    console.log('Removing old junction tables...');
    const junctionTables = [
      'deployment_git_repos',
      'deployment_git_commits',
      'deployment_targets',
      'standard_deployment_git_repos',
      'standard_deployment_git_commits',
      'standard_deployment_targets',
    ];

    for (const tableName of junctionTables) {
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}"`);
        console.log(`Dropped table ${tableName}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        console.log(`Table ${tableName} does not exist or already dropped`);
      }
    }

    console.log('Safe cleanup completed successfully');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting safe cleanup deployment schema...');

    // This down migration is intentionally minimal since we're cleaning up problematic state
    // Full rollback would require recreating the junction tables and data migration reversal
    console.log(
      'Note: Full rollback requires manual intervention due to data cleanup nature',
    );
  }
}
