import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDeploymentDataToTargetModel1758015936490 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting deployment data migration to target model...');

    // Step 1: Migrate RecipesDeployment data
    await this.migrateRecipesDeployments(queryRunner);

    // Step 2: Migrate StandardsDeployment data
    await this.migrateStandardsDeployments(queryRunner);

    console.log('Deployment data migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting deployment data migration...');

    // This migration is not easily reversible as it involves data duplication
    // In a real scenario, we would need to implement complex logic to merge back
    // For now, we'll just clear the new fields
    await queryRunner.query(`
            UPDATE deployments 
            SET git_commit_id = NULL, target_id = NULL, status = NULL, error = NULL
        `);

    await queryRunner.query(`
            UPDATE standard_deployments 
            SET git_commit_id = NULL, target_id = NULL, status = NULL, error = NULL
        `);

    console.log('Deployment data migration reverted.');
  }

  private async migrateRecipesDeployments(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.log('Migrating recipes deployments...');

    // Get all existing deployments with their targets and commits
    const deployments = await queryRunner.query(`
            SELECT 
                d.id,
                d.author_id,
                d.organization_id,
                d.created_at,
                d.updated_at,
                d.deleted_at,
                array_agg(DISTINCT dt.target_id) as target_ids,
                array_agg(DISTINCT dgc.git_commit_id) as commit_ids
            FROM deployments d
            LEFT JOIN deployment_targets dt ON dt.deployment_id = d.id
            LEFT JOIN deployment_git_commits dgc ON dgc.deployment_id = d.id
            GROUP BY d.id, d.author_id, d.organization_id, d.created_at, d.updated_at, d.deleted_at
        `);

    for (const deployment of deployments) {
      const targetIds = deployment.target_ids.filter(
        (id: string | null) => id !== null,
      );
      const commitIds = deployment.commit_ids.filter(
        (id: string | null) => id !== null,
      );

      // Handle deployments without targets or commits
      if (targetIds.length === 0 || commitIds.length === 0) {
        console.log(
          `Deployment ${deployment.id} has no targets or commits - deleting orphaned record`,
        );

        // Delete orphaned deployment record (these are invalid deployments)
        await queryRunner.query(`DELETE FROM deployments WHERE id = $1`, [
          deployment.id,
        ]);
        continue;
      }

      // Assume one commit per deployment (as per user story requirements)
      const gitCommitId = commitIds[0];

      if (targetIds.length === 1) {
        // Single target: Update existing deployment record
        await queryRunner.query(
          `
                    UPDATE deployments 
                    SET git_commit_id = $1, target_id = $2, status = 'success', error = NULL
                    WHERE id = $3
                `,
          [gitCommitId, targetIds[0], deployment.id],
        );
      } else {
        // Multiple targets: Keep first target in original record, create new records for others
        // Update original deployment for first target
        await queryRunner.query(
          `
                    UPDATE deployments 
                    SET git_commit_id = $1, target_id = $2, status = 'success', error = NULL
                    WHERE id = $3
                `,
          [gitCommitId, targetIds[0], deployment.id],
        );

        // Create new deployment records for remaining targets
        for (let i = 1; i < targetIds.length; i++) {
          const newDeploymentId = await this.generateUUID(queryRunner);

          // Create new deployment record
          await queryRunner.query(
            `
                        INSERT INTO deployments (
                            id, author_id, organization_id, git_commit_id, target_id, 
                            status, error, created_at, updated_at, deleted_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `,
            [
              newDeploymentId,
              deployment.author_id,
              deployment.organization_id,
              gitCommitId,
              targetIds[i],
              'success',
              null,
              deployment.created_at,
              deployment.updated_at,
              deployment.deleted_at,
            ],
          );

          // Copy recipe version relationships
          await queryRunner.query(
            `
                        INSERT INTO deployment_recipe_versions (deployment_id, recipe_version_id)
                        SELECT $1, recipe_version_id 
                        FROM deployment_recipe_versions 
                        WHERE deployment_id = $2
                    `,
            [newDeploymentId, deployment.id],
          );
        }
      }
    }

    console.log(`Migrated ${deployments.length} recipes deployments.`);
  }

  private async migrateStandardsDeployments(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.log('Migrating standards deployments...');

    // Get all existing standard deployments with their targets and commits
    const deployments = await queryRunner.query(`
            SELECT 
                d.id,
                d.author_id,
                d.organization_id,
                d.created_at,
                d.updated_at,
                d.deleted_at,
                array_agg(DISTINCT sdt.target_id) as target_ids,
                array_agg(DISTINCT sdgc.git_commit_id) as commit_ids
            FROM standard_deployments d
            LEFT JOIN standard_deployment_targets sdt ON sdt.standard_deployment_id = d.id
            LEFT JOIN standard_deployment_git_commits sdgc ON sdgc.standard_deployment_id = d.id
            GROUP BY d.id, d.author_id, d.organization_id, d.created_at, d.updated_at, d.deleted_at
        `);

    for (const deployment of deployments) {
      const targetIds = deployment.target_ids.filter(
        (id: string | null) => id !== null,
      );
      const commitIds = deployment.commit_ids.filter(
        (id: string | null) => id !== null,
      );

      // Handle deployments without targets or commits
      if (targetIds.length === 0 || commitIds.length === 0) {
        console.log(
          `Standard deployment ${deployment.id} has no targets or commits - deleting orphaned record`,
        );

        // Delete orphaned deployment record (these are invalid deployments)
        await queryRunner.query(
          `DELETE FROM standard_deployments WHERE id = $1`,
          [deployment.id],
        );
        continue;
      }

      // Assume one commit per deployment (as per user story requirements)
      const gitCommitId = commitIds[0];

      if (targetIds.length === 1) {
        // Single target: Update existing deployment record
        await queryRunner.query(
          `
                    UPDATE standard_deployments 
                    SET git_commit_id = $1, target_id = $2, status = 'success', error = NULL
                    WHERE id = $3
                `,
          [gitCommitId, targetIds[0], deployment.id],
        );
      } else {
        // Multiple targets: Keep first target in original record, create new records for others
        // Update original deployment for first target
        await queryRunner.query(
          `
                    UPDATE standard_deployments 
                    SET git_commit_id = $1, target_id = $2, status = 'success', error = NULL
                    WHERE id = $3
                `,
          [gitCommitId, targetIds[0], deployment.id],
        );

        // Create new deployment records for remaining targets
        for (let i = 1; i < targetIds.length; i++) {
          const newDeploymentId = await this.generateUUID(queryRunner);

          // Create new deployment record
          await queryRunner.query(
            `
                        INSERT INTO standard_deployments (
                            id, author_id, organization_id, git_commit_id, target_id, 
                            status, error, created_at, updated_at, deleted_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `,
            [
              newDeploymentId,
              deployment.author_id,
              deployment.organization_id,
              gitCommitId,
              targetIds[i],
              'success',
              null,
              deployment.created_at,
              deployment.updated_at,
              deployment.deleted_at,
            ],
          );

          // Copy standard version relationships
          await queryRunner.query(
            `
                        INSERT INTO standard_deployment_versions (standard_deployment_id, standard_version_id)
                        SELECT $1, standard_version_id 
                        FROM standard_deployment_versions 
                        WHERE standard_deployment_id = $2
                    `,
            [newDeploymentId, deployment.id],
          );
        }
      }
    }

    console.log(`Migrated ${deployments.length} standards deployments.`);
  }

  private async generateUUID(queryRunner: QueryRunner): Promise<string> {
    // Generate a UUID using PostgreSQL's built-in gen_random_uuid() function
    const result = await queryRunner.query('SELECT gen_random_uuid() as uuid');
    return result[0].uuid;
  }
}
