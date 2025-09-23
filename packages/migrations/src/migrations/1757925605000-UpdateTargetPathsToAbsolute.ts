import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/shared';

const origin = 'UpdateTargetPathsToAbsolute1757925605000';

export class UpdateTargetPathsToAbsolute1757925605000
  implements MigrationInterface
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: UpdateTargetPathsToAbsolute');

    try {
      // Find all targets with relative path '.'
      const targetsWithRelativePath = await queryRunner.query(
        `SELECT id, name, path FROM targets WHERE path = '.'`,
      );

      this.logger.info(
        `Found ${targetsWithRelativePath.length} targets with relative path '.'`,
      );

      if (targetsWithRelativePath.length > 0) {
        // Log the targets that will be updated
        targetsWithRelativePath.forEach(
          (target: { id: string; name: string; path: string }) => {
            this.logger.debug(
              `Updating target: ${target.name} (ID: ${target.id})`,
            );
          },
        );

        // Update all targets with path '.' to '/'
        await queryRunner.query(
          `UPDATE targets SET path = '/', updated_at = CURRENT_TIMESTAMP WHERE path = '.'`,
        );

        this.logger.info(
          `Updated ${targetsWithRelativePath.length} targets from relative path '.' to absolute path '/'`,
        );
      } else {
        this.logger.info(
          'No targets with relative path found, skipping update',
        );
      }

      // Verify the update
      const remainingRelativePaths = await queryRunner.query(
        `SELECT COUNT(*) as count FROM targets WHERE path = '.'`,
      );

      if (remainingRelativePaths[0].count > 0) {
        throw new Error(
          `Failed to update all relative paths. ${remainingRelativePaths[0].count} targets still have path = '.'`,
        );
      }

      this.logger.info(
        'Migration UpdateTargetPathsToAbsolute completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration UpdateTargetPathsToAbsolute failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(): Promise<void> {
    this.logger.info('No rollback for UpdateTargetPathsToAbsolute');
  }
}
