import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddIsDefaultSpaceToSpaces1773417489327';

export class AddIsDefaultSpaceToSpaces1773417489327 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddIsDefaultSpaceToSpaces');

    try {
      this.logger.debug('Adding is_default_space column to spaces table');
      await queryRunner.query(`
        ALTER TABLE "spaces"
        ADD COLUMN "is_default_space" boolean NOT NULL DEFAULT true
      `);
      this.logger.info(
        'Successfully added is_default_space column to spaces table',
      );

      this.logger.info(
        'Migration AddIsDefaultSpaceToSpaces completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddIsDefaultSpaceToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddIsDefaultSpaceToSpaces');

    try {
      this.logger.debug('Dropping is_default_space column from spaces table');
      await queryRunner.query(`
        ALTER TABLE "spaces" DROP COLUMN "is_default_space"
      `);
      this.logger.info(
        'Successfully dropped is_default_space column from spaces table',
      );

      this.logger.info(
        'Rollback AddIsDefaultSpaceToSpaces completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddIsDefaultSpaceToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
