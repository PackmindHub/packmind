import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddPackageReleaseToMarketplaceDistributions1822000000000';

export class AddPackageReleaseToMarketplaceDistributions1822000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddPackageReleaseToMarketplaceDistributions',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        ADD COLUMN IF NOT EXISTS "package_release_id" uuid NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        ADD CONSTRAINT "FK_marketplace_distributions_package_release"
        FOREIGN KEY ("package_release_id") REFERENCES "package_releases"("id")
        ON DELETE SET NULL
      `);
      this.logger.info('Added package_release_id to marketplace_distributions');

      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        ADD COLUMN IF NOT EXISTS "installed_package_version" varchar NULL
      `);
      this.logger.info(
        'Added installed_package_version to plugin_installations',
      );

      this.logger.info(
        'Migration AddPackageReleaseToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddPackageReleaseToMarketplaceDistributions failed',
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddPackageReleaseToMarketplaceDistributions',
    );
    try {
      await queryRunner.query(`
        ALTER TABLE "plugin_installations"
        DROP COLUMN IF EXISTS "installed_package_version"
      `);
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        DROP CONSTRAINT IF EXISTS "FK_marketplace_distributions_package_release"
      `);
      await queryRunner.query(`
        ALTER TABLE "marketplace_distributions"
        DROP COLUMN IF EXISTS "package_release_id"
      `);

      this.logger.info(
        'Rollback AddPackageReleaseToMarketplaceDistributions completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddPackageReleaseToMarketplaceDistributions failed',
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }
}
