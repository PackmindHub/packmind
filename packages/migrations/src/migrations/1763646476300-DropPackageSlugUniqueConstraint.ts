import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'DropPackageSlugUniqueConstraint1763646476300';

export class DropPackageSlugUniqueConstraint1763646476300
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: DropPackageSlugUniqueConstraint');
    try {
      this.logger.debug('Dropping unique index idx_packages_slug if it exists');
      await queryRunner.query('DROP INDEX IF EXISTS idx_packages_slug;');

      this.logger.info(
        'Migration DropPackageSlugUniqueConstraint completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration DropPackageSlugUniqueConstraint failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: DropPackageSlugUniqueConstraint');
    try {
      this.logger.debug(
        'Recreating unique partial index idx_packages_slug on (slug) WHERE deleted_at IS NULL',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_slug ON packages (slug) WHERE deleted_at IS NULL;',
      );

      this.logger.info(
        'Rollback DropPackageSlugUniqueConstraint completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback DropPackageSlugUniqueConstraint failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
