import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddDecisionToChangeProposals1772704641613';

export class AddDecisionToChangeProposals1772704641613 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddDecisionToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ADD COLUMN "decision" jsonb NULL DEFAULT NULL
      `);

      this.logger.info(
        'Migration AddDecisionToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Migration AddDecisionToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddDecisionToChangeProposals');

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        DROP COLUMN IF EXISTS "decision"
      `);

      this.logger.info(
        'Rollback AddDecisionToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error('Rollback AddDecisionToChangeProposals failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
