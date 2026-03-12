import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddTypeToSpaces1773324591884';

export class AddTypeToSpaces1773324591884 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddTypeToSpaces');

    try {
      this.logger.debug('Adding type column to spaces table');
      await queryRunner.query(`
        ALTER TABLE "spaces"
        ADD COLUMN "type" varchar(50) NOT NULL DEFAULT 'open'
      `);
      this.logger.info('Successfully added type column to spaces table');

      this.logger.info('Migration AddTypeToSpaces completed successfully');
    } catch (error) {
      this.logger.error('Migration AddTypeToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddTypeToSpaces');

    try {
      this.logger.debug('Dropping type column from spaces table');
      await queryRunner.query(`
        ALTER TABLE "spaces" DROP COLUMN "type"
      `);
      this.logger.info('Successfully dropped type column from spaces table');

      this.logger.info('Rollback AddTypeToSpaces completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddTypeToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
