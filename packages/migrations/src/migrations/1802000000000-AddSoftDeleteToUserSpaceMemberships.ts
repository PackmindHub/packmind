import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddSoftDeleteToUserSpaceMemberships1802000000000';

export class AddSoftDeleteToUserSpaceMemberships1802000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSoftDeleteToUserSpaceMemberships');

    try {
      this.logger.debug(
        'Adding soft-delete columns to table: user_space_memberships',
      );

      await queryRunner.query(`
        ALTER TABLE "user_space_memberships"
        ADD COLUMN "deleted_at" timestamp with time zone DEFAULT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "user_space_memberships"
        ADD COLUMN "deleted_by" varchar(36) DEFAULT NULL
      `);

      this.logger.info(
        'Migration AddSoftDeleteToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddSoftDeleteToUserSpaceMemberships failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSoftDeleteToUserSpaceMemberships');

    try {
      this.logger.debug(
        'Removing soft-delete columns from table: user_space_memberships',
      );

      await queryRunner.query(`
        ALTER TABLE "user_space_memberships"
        DROP COLUMN IF EXISTS "deleted_by"
      `);

      await queryRunner.query(`
        ALTER TABLE "user_space_memberships"
        DROP COLUMN IF EXISTS "deleted_at"
      `);

      this.logger.info(
        'Rollback AddSoftDeleteToUserSpaceMemberships completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSoftDeleteToUserSpaceMemberships failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
