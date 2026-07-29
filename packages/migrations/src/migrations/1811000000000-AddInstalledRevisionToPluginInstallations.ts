import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddInstalledRevisionToPluginInstallations1811000000000';

/**
 * Migration: AddInstalledRevisionToPluginInstallations
 *
 * Adds the `installed_revision` column to `plugin_installations`. The revision
 * is a content hash derived from the distribution's version fingerprint, baked
 * into the tracking-hook env sidecar at publish and reported back by the
 * SessionStart heartbeat. The marketplace classifies an install as up-to-date
 * when its `installed_revision` equals the published distribution's revision.
 *
 * Nullable with no backfill: installs of plugins published before this shipped
 * report no revision, so the column stays NULL and those rows are correctly
 * treated as outdated until the plugin is republished and re-pulled.
 */
export class AddInstalledRevisionToPluginInstallations1811000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddInstalledRevisionToPluginInstallations',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        ADD COLUMN "installed_revision" varchar NULL
      `);
      this.logger.info(
        'Added installed_revision column to plugin_installations',
      );

      this.logger.info(
        'Migration AddInstalledRevisionToPluginInstallations completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddInstalledRevisionToPluginInstallations failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddInstalledRevisionToPluginInstallations',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        DROP COLUMN "installed_revision"
      `);
      this.logger.info(
        'Rollback AddInstalledRevisionToPluginInstallations completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddInstalledRevisionToPluginInstallations failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
