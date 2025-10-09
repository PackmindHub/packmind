import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'AddRenderModesToDeployments1759838957578';

export class AddRenderModesToDeployments1759838957578
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddRenderModesToDeployments');

    try {
      this.logger.debug('Adding render_modes column to deployments table');
      await queryRunner.query(`
        ALTER TABLE "deployments"
        ADD COLUMN "render_modes" json NOT NULL DEFAULT '[]'
      `);

      this.logger.debug(
        'Adding render_modes column to standard_deployments table',
      );
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        ADD COLUMN "render_modes" json NOT NULL DEFAULT '[]'
      `);

      this.logger.info(
        'Migration AddRenderModesToDeployments completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddRenderModesToDeployments failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddRenderModesToDeployments');

    try {
      this.logger.debug(
        'Removing render_modes column from standard_deployments table',
      );
      await queryRunner.query(`
        ALTER TABLE "standard_deployments"
        DROP COLUMN "render_modes"
      `);

      this.logger.debug('Removing render_modes column from deployments table');
      await queryRunner.query(`
        ALTER TABLE "deployments"
        DROP COLUMN "render_modes"
      `);

      this.logger.info(
        'Rollback AddRenderModesToDeployments completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddRenderModesToDeployments failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
