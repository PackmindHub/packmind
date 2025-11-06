import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddSoftDeleteToTargets1757701000000';

export class AddSoftDeleteToTargets1757701000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddSoftDeleteToTargets');

    try {
      this.logger.debug('Adding soft-delete columns to table: targets');

      await queryRunner.query(`
        ALTER TABLE "targets" 
        ADD COLUMN "deleted_at" timestamp with time zone DEFAULT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "targets" 
        ADD COLUMN "deleted_by" varchar(36) DEFAULT NULL
      `);

      this.logger.info(
        'Migration AddSoftDeleteToTargets completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddSoftDeleteToTargets failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddSoftDeleteToTargets');

    try {
      this.logger.debug('Removing soft-delete columns from table: targets');

      await queryRunner.query(`
        ALTER TABLE "targets" 
        DROP COLUMN IF EXISTS "deleted_by"
      `);

      await queryRunner.query(`
        ALTER TABLE "targets" 
        DROP COLUMN IF EXISTS "deleted_at"
      `);

      this.logger.info(
        'Rollback AddSoftDeleteToTargets completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddSoftDeleteToTargets failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
