import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddGitRepoIdAndTargetIdToChangeProposals1773153245194';

export class AddGitRepoIdAndTargetIdToChangeProposals1773153245194 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddGitRepoIdAndTargetIdToChangeProposals',
    );

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        ADD COLUMN "git_repo_id" uuid NULL DEFAULT NULL,
        ADD COLUMN "target_id" uuid NULL DEFAULT NULL
      `);

      this.logger.info(
        'Migration AddGitRepoIdAndTargetIdToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddGitRepoIdAndTargetIdToChangeProposals failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddGitRepoIdAndTargetIdToChangeProposals',
    );

    try {
      await queryRunner.query(`
        ALTER TABLE "change_proposals"
        DROP COLUMN IF EXISTS "git_repo_id",
        DROP COLUMN IF EXISTS "target_id"
      `);

      this.logger.info(
        'Rollback AddGitRepoIdAndTargetIdToChangeProposals completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddGitRepoIdAndTargetIdToChangeProposals failed',
        {
          error: (error as Error).message,
        },
      );
      throw error;
    }
  }
}
