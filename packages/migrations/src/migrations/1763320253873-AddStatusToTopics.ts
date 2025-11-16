import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/node-utils';

export class AddStatusToTopics1763320253873 implements MigrationInterface {
  private readonly logger = new PackmindLogger(
    'AddStatusToTopics1763320253873',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddStatusToTopics');

    try {
      // Create enum type for topic status
      await queryRunner.query(`
        CREATE TYPE topic_status AS ENUM ('PENDING', 'DIGESTED');
      `);

      // Add status column to topics table with default value PENDING
      await queryRunner.query(`
        ALTER TABLE "topics"
        ADD COLUMN "status" topic_status NOT NULL DEFAULT 'PENDING';
      `);

      this.logger.info('Migration AddStatusToTopics completed successfully');
    } catch (error) {
      this.logger.error('Migration AddStatusToTopics failed', {
        error: error.message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddStatusToTopics');

    try {
      // Remove status column from topics table
      await queryRunner.query(`
        ALTER TABLE "topics"
        DROP COLUMN "status";
      `);

      // Drop enum type
      await queryRunner.query(`
        DROP TYPE topic_status;
      `);

      this.logger.info('Rollback AddStatusToTopics completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddStatusToTopics failed', {
        error: error.message,
      });
      throw error;
    }
  }
}
