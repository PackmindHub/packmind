import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

const origin = 'UpdateStandardSlugIndex1757442040000';

export class UpdateStandardSlugIndex1757442040000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateStandardSlugIndex');
    try {
      // Drop previous unique index on slug only if it exists
      this.logger.debug(
        'Dropping old unique index idx_standard_slug if it exists',
      );
      await queryRunner.query('DROP INDEX IF EXISTS idx_standard_slug;');

      // Create new unique partial index on (slug, organization_id) where not soft-deleted
      this.logger.debug(
        'Creating new unique partial index idx_standard_slug on (slug, organization_id) WHERE deleted_at IS NULL',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_standard_slug ON standards (slug, organization_id) WHERE deleted_at IS NULL;',
      );

      this.logger.info(
        'Migration UpdateStandardSlugIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateStandardSlugIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: UpdateStandardSlugIndex');
    try {
      // Drop the partial unique index
      this.logger.debug('Dropping partial unique index idx_standard_slug');
      await queryRunner.query('DROP INDEX IF EXISTS idx_standard_slug;');

      // Recreate the previous unique index on slug only
      this.logger.debug(
        'Recreating old unique index idx_standard_slug on slug only',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_standard_slug ON standards (slug);',
      );

      this.logger.info(
        'Rollback UpdateStandardSlugIndex completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback UpdateStandardSlugIndex failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
