import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftProgramDraftVersionToActiveDetectionPrograms1756200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            ADD COLUMN "draft_program_draft_version" uuid NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            ADD CONSTRAINT "FK_active_detection_programs_draft_program" 
            FOREIGN KEY ("draft_program_draft_version") 
            REFERENCES "detection_programs"("id") 
            ON DELETE SET NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            DROP CONSTRAINT IF EXISTS "FK_active_detection_programs_draft_program"
        `);

    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            DROP COLUMN "draft_program_draft_version"
        `);
  }
}
