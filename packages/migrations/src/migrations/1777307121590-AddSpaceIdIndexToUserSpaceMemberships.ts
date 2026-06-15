import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddSpaceIdIndexToUserSpaceMemberships1777307121590';

export class AddSpaceIdIndexToUserSpaceMemberships1777307121590 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddSpaceIdIndexToUserSpaceMemberships',
    );

    try {
      this.logger.debug('Creating index on user_space_memberships.space_id');
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "idx_user_space_membership_space" ON "user_space_memberships" ("space_id")',
      );
      this.logger.info(
        'Successfully created index on user_space_memberships.space_id',
      );

      this.logger.info(
        'Migration AddSpaceIdIndexToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddSpaceIdIndexToUserSpaceMemberships failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddSpaceIdIndexToUserSpaceMemberships',
    );

    try {
      this.logger.debug('Dropping index from user_space_memberships table');
      await queryRunner.query(
        'DROP INDEX IF EXISTS "idx_user_space_membership_space"',
      );
      this.logger.info(
        'Successfully dropped index on user_space_memberships.space_id',
      );

      this.logger.info(
        'Rollback AddSpaceIdIndexToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddSpaceIdIndexToUserSpaceMemberships failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
