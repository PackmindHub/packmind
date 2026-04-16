import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddPinnedToUserSpaceMemberships1776341577992';

export class AddPinnedToUserSpaceMemberships1776341577992 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddPinnedToUserSpaceMemberships');

    try {
      await queryRunner.query(`
        ALTER TABLE "user_space_memberships"
        ADD COLUMN "pinned" boolean NOT NULL DEFAULT false
      `);
      this.logger.info(
        'Successfully added pinned column to user_space_memberships table',
      );

      this.logger.info(
        'Migration AddPinnedToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddPinnedToUserSpaceMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddPinnedToUserSpaceMemberships');

    try {
      await queryRunner.query(`
        ALTER TABLE "user_space_memberships" DROP COLUMN "pinned"
      `);
      this.logger.info(
        'Successfully dropped pinned column from user_space_memberships table',
      );

      this.logger.info(
        'Rollback AddPinnedToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddPinnedToUserSpaceMemberships failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
