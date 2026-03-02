import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AlterChangeProposalsNullableArtefactId1769000000000';

export class AlterChangeProposalsNullableArtefactId1769000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AlterChangeProposalsNullableArtefactId',
    );

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ALTER COLUMN "artefact_id" DROP NOT NULL
      `);

      this.logger.info(
        'Migration AlterChangeProposalsNullableArtefactId completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AlterChangeProposalsNullableArtefactId failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AlterChangeProposalsNullableArtefactId',
    );

    try {
      // Only safe if no null rows exist
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ALTER COLUMN "artefact_id" SET NOT NULL
      `);

      this.logger.info(
        'Rollback AlterChangeProposalsNullableArtefactId completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AlterChangeProposalsNullableArtefactId failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }
}
