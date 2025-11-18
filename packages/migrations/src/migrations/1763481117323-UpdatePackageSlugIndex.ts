import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'UpdatePackageSlugIndex1763481117323';

export class UpdatePackageSlugIndex1763481117323 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdatePackageSlugIndex');
    try {
      // Drop previous unique index on slug only if it exists
      this.logger.debug(
        'Dropping old unique index idx_packages_slug if it exists',
      );
      await queryRunner.query('DROP INDEX IF EXISTS idx_packages_slug;');

      // Create new unique partial index on slug where not soft-deleted
      this.logger.debug(
        'Creating new unique partial index idx_packages_slug on (slug) WHERE deleted_at IS NULL',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_slug ON packages (slug) WHERE deleted_at IS NULL;',
      );

      this.logger.info(
        'Migration UpdatePackageSlugIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdatePackageSlugIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdatePackageSlugIndex');
    try {
      // Drop the partial unique index
      this.logger.debug('Dropping partial unique index idx_packages_slug');
      await queryRunner.query('DROP INDEX IF EXISTS idx_packages_slug;');

      // Recreate the previous unique index on slug only
      this.logger.debug(
        'Recreating old unique index idx_packages_slug on slug only',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_slug ON packages (slug);',
      );

      this.logger.info(
        'Rollback UpdatePackageSlugIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdatePackageSlugIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
