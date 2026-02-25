import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddMessageToChangeProposals1768900000000';

export class AddMessageToChangeProposals1768900000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddMessageToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ADD COLUMN "message" varchar(1024) NOT NULL DEFAULT ''
      `);

      this.logger.info(
        'Migration AddMessageToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddMessageToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddMessageToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        DROP COLUMN IF EXISTS "message"
      `);

      this.logger.info(
        'Rollback AddMessageToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddMessageToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
