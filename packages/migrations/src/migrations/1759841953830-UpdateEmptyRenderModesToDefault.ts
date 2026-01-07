import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'UpdateEmptyRenderModesToDefault1759841953830';

const DEFAULT_RENDER_MODES = [
  'PACKMIND',
  'AGENTS_MD',
  'JUNIE',
  'GH_COPILOT',
  'CLAUDE',
  'CURSOR',
];

export class UpdateEmptyRenderModesToDefault1759841953830
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateEmptyRenderModesToDefault');

    try {
      // Update recipes deployments with empty render_modes
      this.logger.debug(
        'Updating recipes deployments with empty render_modes to default',
      );
      const recipesResult = await queryRunner.query(
        `
        UPDATE "deployments"
        SET "render_modes" = $1
        WHERE "render_modes"::text = '[]'
      `,
        [JSON.stringify(DEFAULT_RENDER_MODES)],
      );
      this.logger.info(
        `Updated ${recipesResult[1]} recipes deployment records with default render modes`,
      );

      // Update standards deployments with empty render_modes
      this.logger.debug(
        'Updating standards deployments with empty render_modes to default',
      );
      const standardsResult = await queryRunner.query(
        `
        UPDATE "standard_deployments"
        SET "render_modes" = $1
        WHERE "render_modes"::text = '[]'
      `,
        [JSON.stringify(DEFAULT_RENDER_MODES)],
      );
      this.logger.info(
        `Updated ${standardsResult[1]} standards deployment records with default render modes`,
      );

      this.logger.info(
        'Migration UpdateEmptyRenderModesToDefault completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateEmptyRenderModesToDefault failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateEmptyRenderModesToDefault');

    try {
      // Revert recipes deployments back to empty array
      this.logger.debug(
        'Reverting recipes deployments with default render_modes to empty array',
      );
      const recipesResult = await queryRunner.query(
        `
        UPDATE "deployments"
        SET "render_modes" = '[]'::json
        WHERE "render_modes"::text = $1
      `,
        [JSON.stringify(DEFAULT_RENDER_MODES)],
      );
      this.logger.info(
        `Reverted ${recipesResult[1]} recipes deployment records to empty render modes`,
      );

      // Revert standards deployments back to empty array
      this.logger.debug(
        'Reverting standards deployments with default render_modes to empty array',
      );
      const standardsResult = await queryRunner.query(
        `
        UPDATE "standard_deployments"
        SET "render_modes" = '[]'::json
        WHERE "render_modes"::text = $1
      `,
        [JSON.stringify(DEFAULT_RENDER_MODES)],
      );
      this.logger.info(
        `Reverted ${standardsResult[1]} standards deployment records to empty render modes`,
      );

      this.logger.info(
        'Rollback UpdateEmptyRenderModesToDefault completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdateEmptyRenderModesToDefault failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
