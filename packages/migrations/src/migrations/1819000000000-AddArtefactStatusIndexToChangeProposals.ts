import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'AddArtefactStatusIndexToChangeProposals1819000000000';

/**
 * Adds a composite index on `change_proposals` supporting the "list pending
 * change proposals for an artefact, ordered by creation date" lookup.
 *
 * The column order (`artefact_id`, `status`, `created_at`) matches the
 * expected query shape: `WHERE artefact_id = :id AND status = 'pending'
 * ORDER BY created_at`, so Postgres can satisfy the equality filters and the
 * ordering directly from the index without a separate sort step.
 *
 * The `down` method drops the index, fully reversing the change.
 */
export class AddArtefactStatusIndexToChangeProposals1819000000000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting migration: AddArtefactStatusIndexToChangeProposals',
    );

    try {
      this.logger.debug(
        'Creating idx_change_proposal_artefact_status_created index',
      );
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_change_proposal_artefact_status_created"
        ON "change_proposals" ("artefact_id", "status", "created_at")
      `);

      this.logger.info(
        'Migration AddArtefactStatusIndexToChangeProposals completed',
      );
    } catch (error) {
      this.logger.error(
        'Migration AddArtefactStatusIndexToChangeProposals failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info(
      'Starting rollback: AddArtefactStatusIndexToChangeProposals',
    );

    try {
      this.logger.debug(
        'Dropping idx_change_proposal_artefact_status_created index',
      );
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_change_proposal_artefact_status_created"
      `);

      this.logger.info(
        'Rollback AddArtefactStatusIndexToChangeProposals completed',
      );
    } catch (error) {
      this.logger.error(
        'Rollback AddArtefactStatusIndexToChangeProposals failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
