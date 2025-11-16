import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export class EnablePgvectorExtension1763330623196
  implements MigrationInterface
{
  private readonly logger = new PackmindLogger(
    'EnablePgvectorExtension1763330623196',
    LogLevel.DEBUG,
  );

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: Enable pgvector extension');

    try {
      this.logger.debug('Creating vector extension');
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

      this.logger.info(
        'Migration EnablePgvectorExtension completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration EnablePgvectorExtension failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: Enable pgvector extension');

    try {
      this.logger.debug('Dropping vector extension');
      await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);

      this.logger.info(
        'Rollback EnablePgvectorExtension completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback EnablePgvectorExtension failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
