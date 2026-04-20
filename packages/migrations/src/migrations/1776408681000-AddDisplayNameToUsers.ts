import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddDisplayNameToUsers1776408681000';

export class AddDisplayNameToUsers1776408681000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDisplayNameToUsers');

    try {
      this.logger.debug('Adding display_name column');
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "display_name" varchar(255)`,
      );

      this.logger.info(
        'Migration AddDisplayNameToUsers completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddDisplayNameToUsers failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDisplayNameToUsers');

    try {
      this.logger.debug('Dropping display_name column');
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);

      this.logger.info('Rollback AddDisplayNameToUsers completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddDisplayNameToUsers failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
