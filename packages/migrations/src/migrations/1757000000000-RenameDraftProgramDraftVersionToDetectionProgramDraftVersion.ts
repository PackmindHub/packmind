import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDraftProgramDraftVersionToDetectionProgramDraftVersion1757000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename column draft_program_draft_version -> detection_program_draft_version
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            RENAME COLUMN "draft_program_draft_version" TO "detection_program_draft_version"
        `);

    // Update foreign key constraint name to reflect new column (drop and recreate)
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            DROP CONSTRAINT IF EXISTS "FK_active_detection_programs_draft_program"
        `);

    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            ADD CONSTRAINT "FK_active_detection_programs_detection_program_draft"
            FOREIGN KEY ("detection_program_draft_version")
            REFERENCES "detection_programs"("id")
            ON DELETE SET NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert foreign key constraint to previous name/column
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            DROP CONSTRAINT IF EXISTS "FK_active_detection_programs_detection_program_draft"
        `);

    // Rename column back
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            RENAME COLUMN "detection_program_draft_version" TO "draft_program_draft_version"
        `);

    await queryRunner.query(`
            ALTER TABLE "active_detection_programs"
            ADD CONSTRAINT "FK_active_detection_programs_draft_program"
            FOREIGN KEY ("draft_program_draft_version")
            REFERENCES "detection_programs"("id")
            ON DELETE SET NULL
        `);
  }
}
