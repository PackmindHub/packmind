import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddDeploymentTargetRelationships1757669713654';

export class AddDeploymentTargetRelationships1757669713654
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDeploymentTargetRelationships');

    try {
      // Create deployment_targets junction table for recipes deployments
      this.logger.debug('Creating deployment_targets junction table');
      await queryRunner.createTable(
        new Table({
          name: 'deployment_targets',
          columns: [
            {
              name: 'deployment_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'target_id',
              type: 'uuid',
              isNullable: false,
            },
          ],
          indices: [
            {
              name: 'idx_deployment_targets_unique',
              columnNames: ['deployment_id', 'target_id'],
              isUnique: true,
            },
            {
              name: 'idx_deployment_targets_deployment',
              columnNames: ['deployment_id'],
            },
            {
              name: 'idx_deployment_targets_target',
              columnNames: ['target_id'],
            },
          ],
        }),
      );

      // Create standard_deployment_targets junction table for standards deployments
      this.logger.debug('Creating standard_deployment_targets junction table');
      await queryRunner.createTable(
        new Table({
          name: 'standard_deployment_targets',
          columns: [
            {
              name: 'standard_deployment_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'target_id',
              type: 'uuid',
              isNullable: false,
            },
          ],
          indices: [
            {
              name: 'idx_standard_deployment_targets_unique',
              columnNames: ['standard_deployment_id', 'target_id'],
              isUnique: true,
            },
            {
              name: 'idx_standard_deployment_targets_deployment',
              columnNames: ['standard_deployment_id'],
            },
            {
              name: 'idx_standard_deployment_targets_target',
              columnNames: ['target_id'],
            },
          ],
        }),
      );

      // Create foreign keys for deployment_targets
      this.logger.debug('Adding foreign keys for deployment_targets');
      await queryRunner.createForeignKey(
        'deployment_targets',
        new TableForeignKey({
          columnNames: ['deployment_id'],
          referencedTableName: 'deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          name: 'FK_deployment_targets_deployment',
        }),
      );

      await queryRunner.createForeignKey(
        'deployment_targets',
        new TableForeignKey({
          columnNames: ['target_id'],
          referencedTableName: 'targets',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          name: 'FK_deployment_targets_target',
        }),
      );

      // Create foreign keys for standard_deployment_targets
      this.logger.debug('Adding foreign keys for standard_deployment_targets');
      await queryRunner.createForeignKey(
        'standard_deployment_targets',
        new TableForeignKey({
          columnNames: ['standard_deployment_id'],
          referencedTableName: 'standard_deployments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          name: 'FK_standard_deployment_targets_deployment',
        }),
      );

      await queryRunner.createForeignKey(
        'standard_deployment_targets',
        new TableForeignKey({
          columnNames: ['target_id'],
          referencedTableName: 'targets',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          name: 'FK_standard_deployment_targets_target',
        }),
      );

      // Populate deployment_targets with data based on existing git repo relationships
      this.logger.debug(
        'Populating deployment_targets from existing git repo relationships',
      );
      await queryRunner.query(`
        INSERT INTO deployment_targets (deployment_id, target_id)
        SELECT DISTINCT dgr.deployment_id, t.id as target_id
        FROM deployment_git_repos dgr
        INNER JOIN targets t ON t.git_repo_id = dgr.git_repo_id
        WHERE NOT EXISTS (
          SELECT 1 FROM deployment_targets dt 
          WHERE dt.deployment_id = dgr.deployment_id 
          AND dt.target_id = t.id
        )
      `);

      // Populate standard_deployment_targets with data based on existing git repo relationships
      this.logger.debug(
        'Populating standard_deployment_targets from existing git repo relationships',
      );
      await queryRunner.query(`
        INSERT INTO standard_deployment_targets (standard_deployment_id, target_id)
        SELECT DISTINCT sdgr.standard_deployment_id, t.id as target_id
        FROM standard_deployment_git_repos sdgr
        INNER JOIN targets t ON t.git_repo_id = sdgr.git_repo_id
        WHERE NOT EXISTS (
          SELECT 1 FROM standard_deployment_targets sdt 
          WHERE sdt.standard_deployment_id = sdgr.standard_deployment_id 
          AND sdt.target_id = t.id
        )
      `);

      const deploymentTargetsCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM deployment_targets`,
      );
      const standardDeploymentTargetsCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM standard_deployment_targets`,
      );

      this.logger.info(
        `Created ${deploymentTargetsCount[0]?.count || 0} deployment-target relationships`,
      );
      this.logger.info(
        `Created ${standardDeploymentTargetsCount[0]?.count || 0} standard deployment-target relationships`,
      );
      this.logger.info(
        'Migration AddDeploymentTargetRelationships completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddDeploymentTargetRelationships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDeploymentTargetRelationships');

    try {
      // Drop foreign keys first
      this.logger.debug('Dropping foreign keys');
      await queryRunner.dropForeignKey(
        'deployment_targets',
        'FK_deployment_targets_deployment',
      );
      await queryRunner.dropForeignKey(
        'deployment_targets',
        'FK_deployment_targets_target',
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_targets',
        'FK_standard_deployment_targets_deployment',
      );
      await queryRunner.dropForeignKey(
        'standard_deployment_targets',
        'FK_standard_deployment_targets_target',
      );

      // Drop junction tables
      this.logger.debug('Dropping junction tables');
      await queryRunner.dropTable('deployment_targets');
      await queryRunner.dropTable('standard_deployment_targets');

      this.logger.info(
        'Rollback AddDeploymentTargetRelationships completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddDeploymentTargetRelationships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
