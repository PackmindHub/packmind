import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLanguageToDetectionProgram1756131626379
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add language column
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            ADD COLUMN "language" varchar NOT NULL DEFAULT 'javascript'
        `);

    // Remove the default after adding the column
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            ALTER COLUMN "language" DROP DEFAULT
        `);

    // Drop the existing index
    await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_detection_programs_rule_id"
        `);

    // Populate language column from active_detection_programs
    await queryRunner.query(`
            UPDATE "detection_programs" dp
            SET "language" = adp."language"
            FROM "active_detection_programs" adp
            WHERE adp."detection_program_version" = dp."id"
        `);

    // Clean up duplicates - keep only the most recently updated record for each rule_id + language combination
    await queryRunner.query(`
            DELETE FROM "detection_programs" 
            WHERE id NOT IN (
                SELECT DISTINCT ON ("rule_id", "language") id
                FROM "detection_programs" 
                ORDER BY "rule_id", "language", "updated_at" DESC NULLS LAST, id DESC
            )
        `);

    // Create unique constraint on ruleId + language
    await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_detection_programs_rule_language_unique_version" 
            ON "detection_programs" ("rule_id", "language", "version")
        `);

    // Recreate the rule_id index (non-unique)
    await queryRunner.query(`
            CREATE INDEX "idx_detection_programs_rule_id" 
            ON "detection_programs" ("rule_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint
    await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_detection_programs_rule_language_unique"
        `);

    // Drop the rule_id index
    await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_detection_programs_rule_id"
        `);

    // Drop the language column
    await queryRunner.query(`
            ALTER TABLE "detection_programs" 
            DROP COLUMN "language"
        `);
  }
}
