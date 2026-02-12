import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddSoftDeleteToChangeProposals1768600000000';

export class AddSoftDeleteToChangeProposals1768600000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSoftDeleteToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ADD COLUMN "deleted_at" timestamp with time zone DEFAULT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ADD COLUMN "deleted_by" varchar(36) DEFAULT NULL
      `);

      this.logger.info(
        'Migration AddSoftDeleteToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddSoftDeleteToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSoftDeleteToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        DROP COLUMN IF EXISTS "deleted_by"
      `);

      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        DROP COLUMN IF EXISTS "deleted_at"
      `);

      this.logger.info(
        'Rollback AddSoftDeleteToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSoftDeleteToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
