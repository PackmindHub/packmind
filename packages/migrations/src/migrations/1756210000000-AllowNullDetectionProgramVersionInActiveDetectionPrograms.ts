import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullDetectionProgramVersionInActiveDetectionPrograms1756210000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow detection_program_version to be nullable
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            ALTER COLUMN "detection_program_version" DROP NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore NOT NULL constraint (Note: This will fail if there are null values)
    await queryRunner.query(`
            ALTER TABLE "active_detection_programs" 
            ALTER COLUMN "detection_program_version" SET NOT NULL
        `);
  }
}
